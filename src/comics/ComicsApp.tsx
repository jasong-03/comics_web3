import React, { useEffect, useRef, useState } from "react";
import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import jsPDF from "jspdf";
import {
  BACK_COVER_PAGE,
  BATCH_SIZE,
  Beat,
  ComicFace,
  DECISION_PAGES,
  GENRES,
  INITIAL_PAGES,
  LANGUAGES,
  MAX_STORY_PAGES,
  Persona,
  STORIES,
  TONES,
  TOTAL_PAGES,
} from "./types";
import { Setup } from "./Setup";
import { Book } from "./Book";
import { useApiKey } from "./useApiKey";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { NoteOverlay } from "./NoteOverlay";
import "./comics.css";
import { useInfiniteHeroes } from "../hooks/useInfiniteHeroes";
import { base64ToBlob, uploadToWalrus } from "../utils/walrus";
import { compressImage } from "../utils/image";

const MODEL_IMAGE_GEN_NAME = "gemini-3-pro-image-preview";
const MODEL_TEXT_NAME = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-image";
const FAILURE_THRESHOLD = 3;

export const ComicsApp: React.FC = () => {
  const { validateApiKey, setShowApiKeyDialog, showApiKeyDialog, handleApiKeyDialogContinue } = useApiKey();
  const [hero, setHeroState] = useState<Persona | null>(null);
  const [friend, setFriendState] = useState<Persona | null>(null);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].code);
  const [customPremise, setCustomPremise] = useState("");
  const [storyTone, setStoryTone] = useState(TONES[0]);
  const [richMode, setRichMode] = useState(true);
  const [selectedStory, setSelectedStory] = useState(STORIES[0].file);
  const [comicFaces, setComicFaces] = useState<ComicFace[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMintingHero, setIsMintingHero] = useState(false);
  const [heroMinted, setHeroMinted] = useState(false);
  const [isMintingComic, setIsMintingComic] = useState(false);
  const [comicMinted, setComicMinted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [heroId, setHeroId] = useState<string | null>(null);
  const [suiStorySegments, setSuiStorySegments] = useState<string[]>([]);
  const [shouldContinue, setShouldContinue] = useState<boolean | null>(null);

  const { mintHero, mintComic } = useInfiniteHeroes();

  const heroRef = useRef<Persona | null>(null);
  const friendRef = useRef<Persona | null>(null);
  const generatingPages = useRef(new Set<number>());
  const historyRef = useRef<ComicFace[]>([]);
  const modelRef = useRef(MODEL_IMAGE_GEN_NAME);
  const failureRef = useRef(0);

  const envApiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_API_KEY;

  // Load story segments from markdown file
  useEffect(() => {
    if (selectedGenre !== "Sui Origin Story") {
      // Only load story if genre is Sui Origin Story
      return;
    }

    fetch(`/${selectedStory}`)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        if (text) {
          // Parse markdown: split by "## Page X" markers
          const segments: string[] = [];
          const pageRegex = /## Page (\d+)\s*\n([\s\S]*?)(?=## Page \d+|$)/g;
          let match;
          while ((match = pageRegex.exec(text)) !== null) {
            const pageNum = parseInt(match[1], 10);
            const content = match[2].trim();
            // Store in array index (pageNum - 1) to match page numbers
            segments[pageNum - 1] = content;
          }
          // Fill gaps with empty strings if needed
          const filledSegments: string[] = [];
          for (let i = 0; i < MAX_STORY_PAGES; i++) {
            filledSegments[i] = segments[i] || "The story continues into the future...";
          }
          setSuiStorySegments(filledSegments);
        } else {
          // Fallback: create empty array
          setSuiStorySegments(Array(MAX_STORY_PAGES).fill("The story continues into the future..."));
        }
      })
      .catch((error) => {
        console.warn(`Failed to load ${selectedStory}`, error);
        // Fallback: create empty array
        setSuiStorySegments(Array(MAX_STORY_PAGES).fill("The story continues into the future..."));
      });
  }, [selectedStory, selectedGenre]);

  const setHero = (persona: Persona | null) => {
    setHeroState(persona);
    heroRef.current = persona;
  };
  const setFriend = (persona: Persona | null) => {
    setFriendState(persona);
    friendRef.current = persona;
  };

  const resolveApiKey = () => {
    if (envApiKey) return envApiKey;
    setShowApiKeyDialog(true);
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  };

  const getAI = () => new GoogleGenAI({ apiKey: resolveApiKey() });

  const noteFailure = () => {
    failureRef.current += 1;
    if (failureRef.current >= FAILURE_THRESHOLD && modelRef.current !== FALLBACK_MODEL) {
      modelRef.current = FALLBACK_MODEL;
    }
  };

  const noteSuccess = () => {
    failureRef.current = 0;
  };

  type ModelPayload = Partial<GenerateContentParameters> & { contents: any };

  const runModel = async (payload: ModelPayload) => {
    const ai = getAI();
    const activeModel = payload.model || modelRef.current;
    const params: GenerateContentParameters = { ...payload, model: activeModel };
    try {
      const response = await ai.models.generateContent(params);
      noteSuccess();
      return response;
    } catch (error) {
      noteFailure();
      // If we just switched to fallback, try once immediately with it.
      if (modelRef.current !== activeModel) {
        try {
          const fallbackResponse = await ai.models.generateContent({ ...params, model: modelRef.current });
          noteSuccess();
          return fallbackResponse;
        } catch (fallbackError) {
          noteFailure();
          throw fallbackError;
        }
      }
      throw error;
    }
  };

  const handleAPIError = (error: unknown) => {
    const msg = String(error);
    console.error("API Error:", msg);
    if (
      msg.includes("Requested entity was not found") ||
      msg.includes("API_KEY_INVALID") ||
      msg.toLowerCase().includes("permission denied")
    ) {
      setShowApiKeyDialog(true);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateBeat = async (
    history: ComicFace[],
    isRightPage: boolean,
    pageNum: number,
    isDecisionPage: boolean,
  ): Promise<Beat> => {
    if (!heroRef.current) throw new Error("No Hero");

    const isFinalPage = pageNum === MAX_STORY_PAGES;
    const langName = LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
    const isSuiStory = selectedGenre === "Sui Origin Story";

    // --- SUI STORY OVERRIDE ---
    if (isSuiStory) {
      const segmentIndex = pageNum - 1;
      const segmentText = suiStorySegments[segmentIndex] || "The story continues into the future...";

      // Get previous context for continuity
      const previousSegments = suiStorySegments.slice(Math.max(0, segmentIndex - 2), segmentIndex);
      const previousContext = previousSegments.length > 0
        ? `PREVIOUS PAGES CONTEXT:\n${previousSegments.map((seg, idx) => `Page ${segmentIndex - previousSegments.length + idx + 1}: ${seg.substring(0, 150)}...`).join("\n")}\n\n`
        : "";

      const prompt = `
You are a master visual storyteller adapting a historical tech narrative into a comic book.
PAGE ${pageNum} of ${MAX_STORY_PAGES}.
${previousContext}SOURCE TEXT FOR THIS PAGE:
"""
${segmentText}
"""

INSTRUCTIONS:
1. ADAPTATION: Convert the SOURCE TEXT into a SINGLE comic panel that CONTINUES the story flow from previous pages.
2. CONTINUITY: This story flows LEFT TO RIGHT, page by page. Ensure this page logically continues from the previous pages' narrative.
3. SCENE: Describe a visual metaphor or literal scene that represents the text.
   - If the text mentions "Engineers" or "Builders", use the visual of the HERO (refer to them as [HERO] in the scene description).
   - If the text mentions "Mark Zuckerberg", "Corporations", "Old Web", or "Vulnerabilities/Bugs", use the visual of the CO-STAR (refer to them as [CO-STAR]).
   - CRITICAL: The scene MUST flow naturally from previous pages. If previous pages established a location or situation, maintain that continuity.
4. TEXT: Create a CAPTION that summarizes the key point and continues the narrative thread. Optionally add DIALOGUE if characters are speaking in the text.
5. LANGUAGE: Output in ${langName}.

OUTPUT JSON ONLY:
{
  "caption": "Narrative text in ${langName} based on source. Must continue the story flow from previous pages.",
  "dialogue": "Optional speech in ${langName}.",
  "scene": "Visual description. Use [HERO] for protagonists/Sui team, [CO-STAR] for antagonists/Old Web/Bugs. MUST maintain continuity with previous pages - if previous scene was in a location, continue there or show natural progression.",
  "focus_char": "hero" or "friend" or "other",
  "choices": []
}
`;
      try {
        const response = await runModel({
          contents: prompt,
          model: MODEL_TEXT_NAME,
          config: { responseMimeType: "application/json" },
        });
        let rawText = response.text || "{}";
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(rawText);

        // Clean up
        if (parsed.dialogue) parsed.dialogue = parsed.dialogue.replace(/^[\w\s-]+:\s*/i, "").replace(/["']/g, "").trim();
        if (parsed.caption) parsed.caption = parsed.caption.replace(/^[\w\s-]+:\s*/i, "").trim();
        parsed.choices = []; // No choices in linear story

        return parsed as Beat;
      } catch (error) {
        console.error("Sui Beat generation failed", error);
        handleAPIError(error);
        return { caption: segmentText.substring(0, 100) + "...", scene: "Abstract digital landscape.", focus_char: "other", choices: [] };
      }
    }

    // --- STANDARD GENRE LOGIC (Existing) ---
    const relevantHistory = history
      .filter((panel) => panel.type === "story" && panel.narrative && (panel.pageIndex || 0) < pageNum)
      .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    const lastBeat = relevantHistory[relevantHistory.length - 1]?.narrative;
    const lastFocus = lastBeat?.focus_char || "none";
    const secondLastBeat = relevantHistory.length > 1 ? relevantHistory[relevantHistory.length - 2]?.narrative : null;

    // Enhanced history formatting for better continuity
    let historyText = "";
    if (relevantHistory.length === 0) {
      historyText = "This is the beginning of the story. Start the adventure.";
    } else if (relevantHistory.length === 1) {
      const panel = relevantHistory[0];
      historyText = `STORY SO FAR:
Page ${panel.pageIndex}: ${panel.narrative?.caption || ""} ${panel.narrative?.dialogue ? `[${panel.narrative.dialogue}]` : ""}
Scene: ${panel.narrative?.scene || ""}
${panel.resolvedChoice ? `User chose: "${panel.resolvedChoice}"` : ""}

CONTINUITY: Continue directly from this scene. The story flows left to right, page by page.`;
    } else {
      // Create a narrative summary for better flow
      const recentPages = relevantHistory.slice(-3); // Last 3 pages for context
      const storyArc = relevantHistory.length <= 4
        ? "EARLY STORY - Establishing the world and characters"
        : relevantHistory.length <= 8
          ? "MID STORY - Complications and rising tension"
          : "LATE STORY - Approaching climax";

      historyText = `STORY ARC: ${storyArc}
STORY FLOW (Pages ${relevantHistory[0]?.pageIndex || 0} to ${relevantHistory[relevantHistory.length - 1]?.pageIndex || 0}):

${recentPages.map((panel, idx) => {
        const pageNum = panel.pageIndex || 0;
        const beat = panel.narrative;
        return `Page ${pageNum}: ${beat?.caption || ""} ${beat?.dialogue ? `[${beat.dialogue}]` : ""}
  → Scene: ${beat?.scene || ""}
  ${panel.resolvedChoice ? `  → User decision: "${panel.resolvedChoice}"` : ""}`;
      }).join("\n\n")}

${relevantHistory.length > 3 ? `\n[Earlier pages: ${relevantHistory.length - 3} pages of story established]` : ""}

CRITICAL CONTINUITY RULES:
1. This story flows LEFT TO RIGHT, page by page in sequence.
2. Each page MUST directly continue from the previous page's scene.
3. Characters, locations, and situations MUST remain consistent.
4. If a character was in a specific location on the previous page, they should logically be there or have moved naturally.
5. Dialogue and actions must follow the established narrative thread.
6. NO sudden jumps or disconnected scenes - maintain smooth narrative flow.`;
    }

    let friendInstruction = "Not yet introduced.";
    if (friendRef.current) {
      friendInstruction = "ACTIVE and PRESENT (User Provided).";
      if (lastFocus !== "friend" && Math.random() > 0.4) {
        friendInstruction += " MANDATORY: FOCUS ON THE CO-STAR FOR THIS PANEL.";
      } else {
        friendInstruction += " Ensure they are woven into the scene even if not the main focus.";
      }
    }

    let coreDriver = `GENRE: ${selectedGenre}. TONE: ${storyTone}.`;
    if (selectedGenre === "Custom") {
      coreDriver = `STORY PREMISE: ${customPremise || "A totally unique, unpredictable adventure"}.`;
    }

    const guardrails = `
      NEGATIVE CONSTRAINTS:
      1. UNLESS GENRE IS "Dark Sci-Fi" OR "Superhero Action" OR "Custom": DO NOT use technical jargon like "Quantum", "Timeline", "Portal", "Multiverse", or "Singularity".
      2. IF GENRE IS "Teen Drama" OR "Lighthearted Comedy": The "stakes" must be SOCIAL, EMOTIONAL, or PERSONAL (e.g., a rumor, a competition, a broken promise, being late, embarrassing oneself). Do NOT make it life-or-death. Keep it grounded.
      3. Avoid "The artifact" or "The device" unless established earlier.
    `;

    // Enhanced continuity instruction
    let continuityNote = "";
    if (lastBeat) {
      continuityNote = `\nCONTINUITY FROM PREVIOUS PAGE: The last scene was "${lastBeat.scene}". `;
      if (lastBeat.dialogue) {
        continuityNote += `The last dialogue was "${lastBeat.dialogue}". `;
      }
      if (lastBeat.caption) {
        continuityNote += `The narrative context was: "${lastBeat.caption}". `;
      }
      continuityNote += `This page MUST continue directly from that moment, flowing naturally left to right. `;
      if (secondLastBeat) {
        continuityNote += `Maintain consistency with the overall story arc established in previous pages.`;
      }
    }

    let instruction = `Continue the story seamlessly. ALL OUTPUT TEXT (Captions, Dialogue, Choices) MUST BE IN ${langName.toUpperCase()}. ${coreDriver} ${guardrails}${continuityNote}`;
    if (richMode) {
      instruction += " RICH/NOVEL MODE ENABLED. Prioritize deeper character thoughts, descriptive captions, and meaningful dialogue exchanges over short punchlines.";
    }

    if (isFinalPage) {
      instruction += " FINAL PAGE. KARMIC CLIFFHANGER REQUIRED. You MUST explicitly reference the User's choice from PAGE 3 in the narrative and show how that specific philosophy led to this conclusion. Text must end with 'TO BE CONTINUED...' (or localized equivalent).";
    } else if (isDecisionPage) {
      instruction += " End with a PSYCHOLOGICAL choice about VALUES, RELATIONSHIPS, or RISK. (e.g., Truth vs. Safety, Forgive vs. Avenge). The options must NOT be simple physical actions like 'Go Left'.";
    } else {
      if (pageNum === 1) {
        instruction += " INCITING INCIDENT. An event disrupts the status quo. Establish the genre's intended mood.";
      } else if (pageNum <= 4) {
        instruction += " RISING ACTION. The heroes engage with the new situation. Build upon what happened in previous pages.";
      } else if (pageNum <= 8) {
        instruction += " COMPLICATION. A twist occurs! A secret is revealed or the path is blocked. This must connect to events from earlier pages.";
      } else {
        instruction += " CLIMAX. The confrontation with the main conflict. Reference and build upon the story arc established in previous pages.";
      }
    }

    const capLimit = richMode
      ? "max 35 words. Detailed narration or internal monologue"
      : "max 15 words";
    const diaLimit = richMode ? "max 30 words. Rich, character-driven speech" : "max 12 words";

    const prompt = `
You are writing a comic book script. PAGE ${pageNum} of ${MAX_STORY_PAGES}.
TARGET LANGUAGE: ${langName}.
${coreDriver}

CHARACTERS:
- HERO: Active.
- CO-STAR: ${friendInstruction}

PREVIOUS PANELS:
${historyText.length > 0 ? historyText : "Start the adventure."}

RULES:
1. NO REPETITION - Each page must advance the story, not repeat previous content.
2. IF CO-STAR IS ACTIVE, THEY MUST APPEAR FREQUENTLY.
3. LANGUAGE: All user-facing text MUST be in ${langName}.
4. CONTINUITY IS CRITICAL - The scene description MUST logically continue from the previous page's scene.
5. FLOW LEFT TO RIGHT - Story progresses sequentially, each page building on the last.
6. MAINTAIN CONSISTENCY - Characters, locations, and situations must remain consistent with previous pages.
7. SMOOTH TRANSITIONS - Avoid sudden jumps. If the previous scene was in a location, this scene should either continue there or show a natural transition.

INSTRUCTION: ${instruction}

OUTPUT STRICT JSON ONLY:
{
  "caption": "Unique narrator text in ${langName}. (${capLimit}). Must continue the narrative thread from previous pages.",
  "dialogue": "Unique speech in ${langName}. (${diaLimit}). Optional. Should feel like a natural continuation of previous conversations.",
  "scene": "Vivid visual description (ALWAYS IN ENGLISH for the artist model). MUST mention 'HERO' or 'CO-STAR' if they are present. CRITICAL: This scene MUST logically continue from the previous page's scene - if the previous scene was in a specific location with specific actions, this scene should either continue that moment or show a natural progression (e.g., 'Continuing from where [HERO] was standing...' or 'Moments later, [HERO] moves to...'). Maintain spatial and temporal continuity.",
  "focus_char": "hero" OR "friend" OR "other",
  "choices": ["Option A in ${langName}", "Option B in ${langName}"] (Only if decision page)
    }
`;
    try {
      const response = await runModel({
        contents: prompt,
        model: MODEL_TEXT_NAME,
        config: { responseMimeType: "application/json" },
      });
      let rawText = response.text || "{}";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText);

      if (parsed.dialogue) parsed.dialogue = parsed.dialogue.replace(/^[\w\s-]+:\s*/i, "").replace(/["']/g, "").trim();
      if (parsed.caption) parsed.caption = parsed.caption.replace(/^[\w\s-]+:\s*/i, "").trim();
      if (!isDecisionPage) parsed.choices = [];
      if (isDecisionPage && !isFinalPage && (!parsed.choices || parsed.choices.length < 2)) parsed.choices = ["Option A", "Option B"];
      if (!["hero", "friend", "other"].includes(parsed.focus_char)) parsed.focus_char = "hero";

      // Enhance scene description for continuity if we have previous context
      if (lastBeat && parsed.scene && pageNum > 1) {
        // Check if scene description seems disconnected
        const lastSceneLower = lastBeat.scene.toLowerCase();
        const currentSceneLower = parsed.scene.toLowerCase();

        // If scene doesn't reference continuity and seems disconnected, add a transition
        if (!currentSceneLower.includes("continue") &&
          !currentSceneLower.includes("moment") &&
          !currentSceneLower.includes("after") &&
          !currentSceneLower.includes("then") &&
          !currentSceneLower.includes("next")) {
          // Try to infer if it's a location change or time jump
          const lastLocation = lastSceneLower.match(/(?:in|at|on|inside|outside|near|beside|within)\s+([a-z\s]+?)(?:\s|$|,|\.)/);
          const currentLocation = currentSceneLower.match(/(?:in|at|on|inside|outside|near|beside|within)\s+([a-z\s]+?)(?:\s|$|,|\.)/);

          if (lastLocation && currentLocation && lastLocation[1] !== currentLocation[1]) {
            // Location changed - add transition context
            parsed.scene = `Continuing from the previous scene, ${parsed.scene.toLowerCase()}`;
          } else {
            // Same location or unclear - add temporal continuity
            parsed.scene = `Moments later, ${parsed.scene.toLowerCase()}`;
          }
        }
      }

      return parsed as Beat;
    } catch (error) {
      console.error("Beat generation failed", error);
      handleAPIError(error);
      return { caption: pageNum === 1 ? "It began..." : "...", scene: `Generic scene for page ${pageNum}.`, focus_char: "hero", choices: [] };
    }
  };

  const generatePersona = async (desc: string): Promise<Persona> => {
    let style = "";
    if (selectedGenre === "Custom" || selectedGenre === "Sui Origin Story") {
      style = "Modern American comic book art";
    } else if (selectedGenre === "Manga (Colorful)") {
      style = "Japanese Manga (Colorful) character sheet";
    } else if (selectedGenre === "Manhwa (Korean Webtoon)") {
      style = "Korean Manhwa/Webtoon character sheet";
    } else if (selectedGenre === "Manhua (Chinese Comics)") {
      style = "Chinese Manhua character sheet";
    } else if (selectedGenre === "Marvel/DC Superhero") {
      style = "Marvel/DC Superhero comic book character sheet";
    } else {
      style = `${selectedGenre} comic`;
    }

    try {
      const response = await runModel({
        contents: { text: `STYLE: Masterpiece ${style}, detailed ink, neutral background. FULL BODY. Character: ${desc}` },
        model: MODEL_IMAGE_GEN_NAME,
        config: { imageConfig: { aspectRatio: "1:1" } },
      });
      const part = response.candidates?.[0]?.content?.parts?.find((contentPart) => contentPart.inlineData);
      if (part?.inlineData?.data) return { base64: part.inlineData.data, desc };
      throw new Error("Failed");
    } catch (error) {
      handleAPIError(error);
      throw error;
    }
  };

  // PROMPT 1: Original Prompt (applies to ALL image types)
  // const generateImage = async (beat: Beat, type: ComicFace["type"]): Promise<string> => {
  //   const contents: any[] = [];
  //   if (heroRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 1 [HERO]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: heroRef.current.base64 } });
  //   }
  //   if (friendRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: friendRef.current.base64 } });
  //   }

  //   const styleEra = (selectedGenre === "Custom" || selectedGenre === "Sui Origin Story") ? "Modern High-Fidelity Graphic Novel" : selectedGenre;
  //   let promptText = `STYLE: ${styleEra}, detailed ink, vibrant colors, dynamic composition. `;

  //   if (type === "cover") {
  //     const langName = LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
  //     const title = selectedGenre === "Sui Origin Story" ? "SUI: THE ORIGIN" : "INFINITE HEROES";
  //     promptText += `TYPE: Comic Book Cover. TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}). Main visual: Dynamic action shot of [HERO] (Use REFERENCE 1).`;
  //   } else if (type === "back_cover") {
  //     promptText += "TYPE: Comic Back Cover. FULL PAGE VERTICAL ART. Dramatic teaser. Text: \"NEXT ISSUE SOON\".";
  //   } else {
  //     promptText += `TYPE: Vertical comic panel. SCENE: ${beat.scene}. `;
  //     promptText += "INSTRUCTIONS: Maintain strict character likeness. If scene mentions 'HERO', you MUST use REFERENCE 1. If scene mentions 'CO-STAR' or 'SIDEKICK', you MUST use REFERENCE 2.";

  //     if (beat.caption) promptText += ` INCLUDE CAPTION BOX: "${beat.caption}"`;
  //     if (beat.dialogue) promptText += ` INCLUDE SPEECH BUBBLE: "${beat.dialogue}"`;
  //   }

  //   contents.push({ text: promptText });

  //   try {
  //     const response = await runModel({
  //       contents,
  //       model: MODEL_IMAGE_GEN_NAME,
  //       config: { imageConfig: { aspectRatio: "2:3" } },
  //     });
  //     const part = response.candidates?.[0]?.content?.parts?.find((contentPart) => contentPart.inlineData);
  //     return part?.inlineData?.data ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
  //   } catch (error) {
  //     handleAPIError(error);
  //     return "";
  //   }
  // };




  const generateImage = async (beat: Beat, type: ComicFace["type"]): Promise<string> => {
    const contents: any[] = [];

    // Push reference images
    if (heroRef.current?.base64) {
      contents.push({ text: "REFERENCE 1 [HERO]:" });
      contents.push({ inlineData: { mimeType: "image/jpeg", data: heroRef.current.base64 } });
    }
    if (friendRef.current?.base64) {
      contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
      contents.push({ inlineData: { mimeType: "image/jpeg", data: friendRef.current.base64 } });
    }

    // Style + Era Detection
    const isManga = selectedGenre === "Manga (Colorful)";
    const isManhwa = selectedGenre === "Manhwa (Korean Webtoon)";
    const isManhua = selectedGenre === "Manhua (Chinese Comics)";
    const isMarvelDC = selectedGenre === "Marvel/DC Superhero";

    const styleEra =
      selectedGenre === "Custom" || selectedGenre === "Sui Origin Story"
        ? "Modern High-Fidelity Graphic Novel"
        : selectedGenre;

    // Base style prompt based on genre
    let promptText = "";
    if (isManga) {
      promptText = `STYLE: Japanese Manga (Colorful), vibrant colors, traditional manga art style, detailed linework, dramatic angles, expressive characters, manga speech bubbles, colorful manga aesthetics. `;
    } else if (isManhwa) {
      promptText = `STYLE: Korean Manhwa/Webtoon, vertical scroll format, vibrant colors, clean line art, modern digital art style, webtoon panel layout, expressive characters, Korean comic aesthetics. `;
    } else if (isManhua) {
      promptText = `STYLE: Chinese Manhua, colorful detailed art, traditional Chinese comic style, intricate backgrounds, expressive character designs, vibrant palette, Chinese comic aesthetics. `;
    } else if (isMarvelDC) {
      promptText = `STYLE: Marvel/DC Superhero Comics, classic American comic book art, bold colors, dynamic action poses, dramatic lighting, superhero comic aesthetics, iconic superhero style. `;
    } else {
      promptText = `STYLE: ${styleEra}, high-detail line art, realistic anatomy, cinematic lighting, consistent color grading. `;
    }

    // ============================================================
    // ENHANCED GLOBAL INSTRUCTIONS (applies to ALL image types)
    // ============================================================
    const GLOBAL_ENHANCE = `
  ART DIRECTION:
  - Ultra-sharp line art, realistic anatomy, polished shading.
  - Cinematic lighting consistent between panels.
  - No distortion of faces or bodies.
  
  CHARACTER BIBLE:
  - HERO: Maintain strict likeness with REFERENCE 1 (facial structure, hairstyle, vibe, skin tone).
  - CO-STAR: Maintain likeness with REFERENCE 2.
  - Do NOT age, deform, or alter facial structure unless explicitly stated.
  
  SCENE CONTINUITY:
  - Keep outfits, lighting, props, injuries, and environment consistent.
  - Maintain continuity with previous panels even if not shown.
  - Character physical placement must follow logical spatial movement.
  
  CAMERA DIRECTION:
  - Use cinematic angles: low-angle, over-the-shoulder, medium shot, dynamic framing.
  - Apply depth-of-field when appropriate.
  
  ENVIRONMENT RULES:
  - Background must remain consistent unless script explicitly changes.
  - No random new elements.
  
  EMOTION CONTROL:
  - Expressions must reflect the emotional tone of the scene.
  - Use subtle micro-expressions for realism.
  
  PANEL COMPOSITION:
  - Clean framing, avoid clutter.
  - Do NOT cover character faces with speech bubbles or captions.
  - Clear silhouette readability.
  
  GENERAL RULES:
  - Maintain strict character likeness with references at all times.
  - High visual logic: no teleporting, no inconsistent props, no changing outfits unless stated.
  `;

    // ============================================================
    // TYPE: COVER / BACK COVER / PANEL
    // ============================================================
    if (type === "cover") {
      const langName =
        LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
      const title =
        selectedGenre === "Sui Origin Story" ? "SUI: THE ORIGIN" : "INFINITE HEROES";

      if (isManga) {
        promptText += `
  TYPE: Japanese Manga Cover (Colorful).
  TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  Main visual: Dynamic manga-style action shot of [HERO] using REFERENCE 1.
  Colorful manga art with vibrant colors, detailed linework, dramatic lighting.
  Manga cover composition with title text integrated in manga style.
  Expressive character pose, dramatic angles, traditional colorful manga aesthetics.
        `;
      } else if (isManhwa) {
        promptText += `
  TYPE: Korean Manhwa/Webtoon Cover.
  TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  Main visual: Dynamic webtoon-style action shot of [HERO] using REFERENCE 1.
  Vibrant colors, clean digital art, modern Korean comic aesthetics.
  Vertical-oriented cover design, webtoon-style composition.
  Expressive character pose, dramatic angles, Korean comic book style.
        `;
      } else if (isManhua) {
        promptText += `
  TYPE: Chinese Manhua Cover.
  TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  Main visual: Dynamic manhua-style action shot of [HERO] using REFERENCE 1.
  Colorful detailed art, intricate backgrounds, vibrant palette.
  Chinese comic cover composition with title text in Chinese comic style.
  Expressive character pose, dramatic angles, traditional Chinese comic aesthetics.
        `;
      } else if (isMarvelDC) {
        promptText += `
  TYPE: Marvel/DC Superhero Comic Cover.
  TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  Main visual: Dynamic superhero-style action shot of [HERO] using REFERENCE 1.
  Classic American comic book art, bold colors, dramatic lighting.
  Superhero cover composition with title text in comic book style.
  Iconic superhero pose, dramatic angles, Marvel/DC comic aesthetics.
        `;
      } else {
        promptText += `
  TYPE: Comic Book Cover.
  TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  Main visual: Dynamic, high-impact action shot of [HERO] using REFERENCE 1.
  Full detail, dramatic lighting, poster-quality composition.
  ${GLOBAL_ENHANCE}
        `;
      }
    }

    else if (type === "back_cover") {
      if (isManga) {
        promptText += `
  TYPE: Japanese Manga Back Cover (Colorful).
  FULL PAGE VERTICAL ART.
  Dramatic teaser tone in manga style. Include small teaser text: "NEXT ISSUE SOON" in manga typography.
  Colorful manga art with vibrant colors, emotional atmosphere, traditional colorful manga aesthetics.
        `;
      } else if (isManhwa) {
        promptText += `
  TYPE: Korean Manhwa/Webtoon Back Cover.
  FULL PAGE VERTICAL ART.
  Dramatic teaser tone in webtoon style. Include small teaser text: "NEXT ISSUE SOON" in webtoon typography.
  Vibrant colors, modern Korean comic aesthetics, emotional atmosphere.
        `;
      } else if (isManhua) {
        promptText += `
  TYPE: Chinese Manhua Back Cover.
  FULL PAGE VERTICAL ART.
  Dramatic teaser tone in manhua style. Include small teaser text: "NEXT ISSUE SOON" in Chinese comic typography.
  Colorful detailed art, Chinese comic aesthetics, emotional atmosphere.
        `;
      } else if (isMarvelDC) {
        promptText += `
  TYPE: Marvel/DC Superhero Comic Back Cover.
  FULL PAGE VERTICAL ART.
  Dramatic teaser tone in superhero comic style. Include small teaser text: "NEXT ISSUE SOON" in comic book typography.
  Classic American comic book art, bold colors, superhero comic aesthetics.
        `;
      } else {
        promptText += `
  TYPE: Comic Back Cover.
  FULL PAGE VERTICAL ART.
  Dramatic teaser tone. Include small teaser text: "NEXT ISSUE SOON".
  Poster-like, emotional atmosphere.
  ${GLOBAL_ENHANCE}
        `;
      }
    }

    else {
      // PANEL GENERATION (Main)
      if (isManga) {
        // Manga style: Multiple panels layout (like Doraemon style)
        promptText += `
  TYPE: Japanese Manga Page Layout (Colorful).
  
  LAYOUT REQUIREMENTS:
  - Create a manga page with multiple panels (3-4 rows, 2-3 panels per row).
  - Use vibrant colors throughout, colorful manga art style.
  - Traditional manga art style with expressive linework.
  - Manga-style speech bubbles (oval/cloud shapes with tails pointing to speakers).
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  PANEL DISTRIBUTION:
  - Break the scene into 6-12 smaller panels across the page.
  - Each panel should show a moment or reaction.
  - Use varied panel sizes for visual rhythm (some small, some larger for emphasis).
  - Include close-ups, medium shots, and wide shots for variety.
  
  INSTRUCTIONS:
  - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  - Use manga-style expressions: exaggerated emotions, sweat drops, action lines.
  - Colorful manga art with vibrant colors, detailed shading and highlights.
  - Manga speech bubbles with tails pointing to the speaking character.
  
  ${beat.caption ? `CAPTION/NARRATION: "${beat.caption}" (place in caption box at top or side of relevant panel).` : ""}
  ${beat.dialogue ? `DIALOGUE: "${beat.dialogue}" (place in manga speech bubble with tail pointing to speaker).` : ""}
  
  MANGA ART RULES:
  - Vibrant colorful manga art, no black and white.
  - Detailed ink linework with colorful fills.
  - Rich colors for backgrounds, characters, and effects.
  - Expressive character faces and body language.
  - Dynamic panel composition.
  - Traditional manga page reading flow (right to left optional, but maintain clear reading order).
        `;
      } else if (isManhwa) {
        // Manhwa/Webtoon style: Vertical scroll format
        promptText += `
  TYPE: Korean Manhwa/Webtoon Panel Layout.
  
  LAYOUT REQUIREMENTS:
  - Create a webtoon-style vertical panel layout (long vertical strip format).
  - Vibrant colors, clean digital art style.
  - Modern Korean comic aesthetics.
  - Webtoon-style speech bubbles and text placement.
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  PANEL DISTRIBUTION:
  - Vertical scroll format with 2-4 panels stacked vertically.
  - Each panel can be full-width or split into columns.
  - Use varied panel heights for visual rhythm.
  - Include close-ups, medium shots, and wide shots for variety.
  
  INSTRUCTIONS:
  - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  - Use webtoon-style expressions: modern, expressive, clean art style.
  - Vibrant colors with clean line art.
  - Webtoon speech bubbles with modern styling.
  
  ${beat.caption ? `CAPTION/NARRATION: "${beat.caption}" (place in caption box at top or side of relevant panel).` : ""}
  ${beat.dialogue ? `DIALOGUE: "${beat.dialogue}" (place in webtoon speech bubble).` : ""}
  
  MANHWA ART RULES:
  - Vibrant, modern color palette.
  - Clean digital line art.
  - Modern Korean comic aesthetics.
  - Expressive character faces and body language.
  - Vertical scroll composition.
  - Webtoon-style panel flow.
        `;
      } else if (isManhua) {
        // Manhua style: Colorful Chinese comics
        promptText += `
  TYPE: Chinese Manhua Panel Layout.
  
  LAYOUT REQUIREMENTS:
  - Create a manhua-style page layout (can be multi-panel or single large panel).
  - Colorful detailed art with intricate backgrounds.
  - Traditional Chinese comic aesthetics.
  - Manhua-style speech bubbles and text placement.
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  PANEL DISTRIBUTION:
  - Can be single large panel or 2-4 panels arranged horizontally/vertically.
  - Each panel should show detailed scenes with intricate backgrounds.
  - Use varied panel sizes for visual rhythm.
  - Include close-ups, medium shots, and wide shots for variety.
  
  INSTRUCTIONS:
  - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  - Use manhua-style expressions: detailed, expressive, colorful art style.
  - Vibrant colors with intricate linework and detailed backgrounds.
  - Manhua speech bubbles with Chinese comic styling.
  
  ${beat.caption ? `CAPTION/NARRATION: "${beat.caption}" (place in caption box at top or side of relevant panel).` : ""}
  ${beat.dialogue ? `DIALOGUE: "${beat.dialogue}" (place in manhua speech bubble).` : ""}
  
  MANHUA ART RULES:
  - Vibrant, detailed color palette.
  - Intricate linework and backgrounds.
  - Chinese comic aesthetics.
  - Expressive character faces and body language.
  - Detailed panel composition.
  - Traditional Chinese comic style.
        `;
      } else if (isMarvelDC) {
        // Marvel/DC Superhero style
        promptText += `
  TYPE: Marvel/DC Superhero Comic Panel.
  
  LAYOUT REQUIREMENTS:
  - Create a classic American superhero comic panel.
  - Bold colors, dynamic action poses.
  - Dramatic lighting and composition.
  - Classic superhero comic aesthetics.
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  PANEL STYLE:
  - Single vertical panel with dynamic superhero composition.
  - Bold, vibrant colors typical of Marvel/DC comics.
  - Dramatic action poses and dynamic angles.
  - Classic comic book art style.
  
  INSTRUCTIONS:
  - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  - Use superhero-style expressions: heroic, dynamic, powerful.
  - Bold colors with dramatic lighting.
  - Classic comic book speech bubbles.
  
  ${beat.caption ? `CAPTION BOX: "${beat.caption}" (place in classic comic book caption box).` : ""}
  ${beat.dialogue ? `SPEECH BUBBLE: "${beat.dialogue}" (place in classic comic book speech bubble).` : ""}
  
  SUPERHERO ART RULES:
  - Bold, vibrant color palette (Marvel/DC style).
  - Dynamic action poses.
  - Dramatic lighting and shadows.
  - Classic American comic book aesthetics.
  - Iconic superhero composition.
  - Powerful, heroic character expressions.
        `;
      } else {
        // Standard comic style
        promptText += `
  TYPE: Vertical comic panel.
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  INSTRUCTIONS:
  - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  - Render the action logically and cinematically.
  
  ${beat.caption ? `CAPTION BOX: "${beat.caption}".` : ""}
  ${beat.dialogue ? `SPEECH BUBBLE: "${beat.dialogue}".` : ""}
  
  ${GLOBAL_ENHANCE}
        `;
      }
    }

    contents.push({ text: promptText });

    // ============================================================
    // EXECUTE MODEL
    // ============================================================
    try {
      const response = await runModel({
        contents,
        model: MODEL_IMAGE_GEN_NAME,
        config: {
          imageConfig: {
            aspectRatio: "2:3", // comic vertical
          },
        },
      });

      const part =
        response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);

      return part?.inlineData?.data
        ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        : "";
    } catch (error) {
      handleAPIError(error);
      return "";
    }
  };


  // PROMPT 3
  // const generateImage = async (beat: Beat, type: ComicFace["type"]): Promise<string> => {
  //   const contents: any[] = [];

  //   // ---------------------------------------------
  //   // Attach reference images
  //   // ---------------------------------------------
  //   if (heroRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 1 [HERO]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: heroRef.current.base64 } });
  //   }
  //   if (friendRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: friendRef.current.base64 } });
  //   }

  //   // ---------------------------------------------
  //   // 1) STYLE ANCHOR (from your reference prompts)
  //   // ---------------------------------------------
  //   const STYLE_ANCHORS = {
  //     "Modern High-Fidelity Graphic Novel": `
  //       Comic book art style, bold ink lines, vivid coloring, cel-shaded, dynamic composition,
  //       high detail, cinematic lighting
  //     `,
  //     "Manga": `
  //       Manga art style, black and white, screentones, ink wash, high contrast,
  //       intricate linework, dramatic angles
  //     `,
  //     "Noir": `
  //       Graphic novel style, Frank Miller aesthetic, chiaroscuro lighting,
  //       heavy shadows, limited palette (black/white/red)
  //     `
  //   };

  //   const styleEra =
  //     selectedGenre === "Custom"
  //       ? "Modern High-Fidelity Graphic Novel"
  //       : selectedGenre === "Sui Origin Story"
  //       ? "Modern High-Fidelity Graphic Novel"
  //       : selectedGenre;

  //   const styleAnchor = STYLE_ANCHORS[styleEra as keyof typeof STYLE_ANCHORS] || STYLE_ANCHORS["Modern High-Fidelity Graphic Novel"];

  //   let promptText = `
  // STYLE ANCHOR:
  // ${styleAnchor}

  // GLOBAL ART RULES:
  // - Ultra-sharp line art, realistic anatomy.
  // - Cinematic lighting consistent between panels.
  // - Dynamic framing and camera movement.
  // - No distortions, no surreal warping.
  // - Consistent outfits, lighting, props, injuries.
  // - Maintain strict likeness to reference images.

  // CHARACTER CONTINUITY:
  // - HERO: Must ALWAYS match REFERENCE 1 (facial structure, hairstyle, vibe).
  // - CO-STAR: Must ALWAYS match REFERENCE 2.
  // - Do NOT alter age, facial anatomy, hair, or body type.

  // ENVIRONMENT CONTINUITY:
  // - Keep backgrounds consistent unless the script explicitly changes scenes.
  // - No random props or sudden environmental changes.

  // CAMERA DIRECTION:
  // - Use cinematic angles (OTS, low-angle, wide shot, close-up).
  // - Depth-of-field optional but should enhance drama.

  // PANEL COMPOSITION:
  // - Clean, readable silhouettes.
  // - Speech bubbles MUST NOT cover faces.
  //   `;

  //   // ---------------------------------------------
  //   // 2) TYPE-SPECIFIC PROMPT BUILDING
  //   // ---------------------------------------------
  //   if (type === "cover") {
  //     const langName =
  //       LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
  //     const title =
  //       selectedGenre === "Sui Origin Story" ? "SUI: THE ORIGIN" : "INFINITE HEROES";

  //     promptText += `
  // TYPE: Comic Book Cover
  // TITLE: "${title}" (or translated into ${langName.toUpperCase()})
  // Main Visual: High-impact action portrait of HERO using REFERENCE 1.
  // Epic pose. Cinematic lighting. Poster composition.
  // AR: 3:2
  //     `;
  //   }

  //   else if (type === "back_cover") {
  //     promptText += `
  // TYPE: Back Cover
  // Vertical full-page art.
  // Dramatic atmosphere, teaser tone.
  // Include small text: "NEXT ISSUE SOON".
  // AR: 2:3
  //     `;
  //   }

  //   else {
  //     // ---------------------------------------------
  //     // 3) SCENE PANEL TYPES (Your Phase 3 integrations)
  //     // ---------------------------------------------

  //     // Apply your extended templates
  //     promptText += `
  // TYPE: Comic Panel

  // SCENE DESCRIPTION:
  // ${beat.scene}

  // LOGIC REQUIREMENTS:
  // - Follow physical and story continuity.
  // - If scene includes HERO -> use REFERENCE 1.
  // - If scene includes CO-STAR or SIDEKICK -> use REFERENCE 2.

  // ${beat.caption ? `CAPTION BOX: "${beat.caption}"` : ""}
  // ${beat.dialogue ? `SPEECH BUBBLE: "${beat.dialogue}"` : ""}

  // ---

  // OPTIONAL SCENE ENHANCEMENTS (AI chooses best fit):

  // 1) ACTION PANEL MODE:
  // - Close-up or dynamic medium shot.
  // - Motion lines, dramatic rim lighting.

  // 2) SPLIT-SCREEN MODE (Dialogue Scenes):
  // - Left: HERO expression matching emotion.
  // - Right: CO-STAR expression reacting logically.
  // - Lightning bolt / energy divide if tension is high.

  // 3) FULL PAGE MINI-LAYOUT MODE:
  // - Up to 3 micro-panels inside one frame if story benefits.
  // - Clean gutters, clear storytelling.

  // ---

  // COMPOSITION:
  // - Clear silhouette focus.
  // - Keep faces unobstructed.
  // - Lighting matches mood of the narrative.
  //     `;
  //   }

  //   contents.push({ text: promptText });

  //   // ---------------------------------------------
  //   // Execute Model
  //   // ---------------------------------------------
  //   try {
  //     const response = await runModel({
  //       contents,
  //       model: MODEL_IMAGE_GEN_NAME,
  //       config: {
  //         imageConfig: { aspectRatio: "2:3" }
  //       }
  //     });

  //     const part =
  //       response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);

  //     return part?.inlineData?.data
  //       ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
  //       : "";
  //   } catch (error) {
  //     handleAPIError(error);
  //     return "";
  //   }
  // };

  const updateFaceState = (id: string, updates: Partial<ComicFace>) => {
    setComicFaces((prev) => prev.map((face) => (face.id === id ? { ...face, ...updates } : face)));
    const index = historyRef.current.findIndex((face) => face.id === id);
    if (index !== -1) historyRef.current[index] = { ...historyRef.current[index], ...updates };
  };

  const generateSinglePage = async (faceId: string, pageNum: number, type: ComicFace["type"], retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 2;

    try {
      // Determine if decision page (disabled for Sui story)
      const isSui = selectedGenre === "Sui Origin Story";
      const isDecision = !isSui && DECISION_PAGES.includes(pageNum);
      let beat: Beat = { scene: "", choices: [], focus_char: "other" };

      if (type === "cover") {
        // Cover beat handled in generateImage
      } else if (type === "back_cover") {
        beat = { scene: "Thematic teaser image", choices: [], focus_char: "other" };
      } else {
        try {
          beat = await generateBeat(historyRef.current, pageNum % 2 === 0, pageNum, isDecision);
        } catch (error) {
          console.error(`Failed to generate beat for page ${pageNum}:`, error);
          if (retryCount < MAX_RETRIES) {
            // Retry beat generation
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return generateSinglePage(faceId, pageNum, type, retryCount + 1);
          }
          // Fallback beat if all retries fail
          beat = {
            caption: pageNum === 1 ? "It began..." : "...",
            scene: `Generic scene for page ${pageNum}.`,
            focus_char: "hero",
            choices: []
          };
        }
      }

      if (beat.focus_char === "friend" && !friendRef.current && type === "story") {
        try {
          const newSidekick = await generatePersona(selectedGenre === "Custom" ? "A fitting sidekick for this story" : `Sidekick for ${selectedGenre} story.`);
          setFriend(newSidekick);
        } catch (error) {
          beat.focus_char = "other";
        }
      }

      updateFaceState(faceId, { narrative: beat, choices: beat.choices, isDecisionPage: isDecision });

      // Generate image with retry logic
      let url = "";
      try {
        url = await generateImage(beat, type);
        if (!url && retryCount < MAX_RETRIES) {
          // Retry image generation
          console.log(`Retrying image generation for page ${pageNum}, attempt ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          url = await generateImage(beat, type);
        }
      } catch (error) {
        console.error(`Failed to generate image for page ${pageNum}:`, error);
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return generateSinglePage(faceId, pageNum, type, retryCount + 1);
        }
      }

      // Only update if we have a valid URL
      if (url) {
        updateFaceState(faceId, { imageUrl: url, isLoading: false });
      } else {
        // Keep loading state if generation failed after retries
        console.error(`Failed to generate image for page ${pageNum} after ${MAX_RETRIES + 1} attempts`);
        updateFaceState(faceId, { isLoading: false });
      }
    } catch (error) {
      console.error(`Error in generateSinglePage for page ${pageNum}:`, error);
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return generateSinglePage(faceId, pageNum, type, retryCount + 1);
      }
      // Mark as not loading if all retries failed
      updateFaceState(faceId, { isLoading: false });
    }
  };

  const generateBatch = async (startPage: number, count: number) => {
    const pagesToGen: number[] = [];
    for (let index = 0; index < count; index++) {
      const page = startPage + index;
      if (page <= TOTAL_PAGES && !generatingPages.current.has(page)) {
        pagesToGen.push(page);
      }
    }

    if (pagesToGen.length === 0) return;
    pagesToGen.forEach((page) => generatingPages.current.add(page));

    const newFaces: ComicFace[] = [];
    pagesToGen.forEach((pageNum) => {
      const type = pageNum === BACK_COVER_PAGE ? "back_cover" : "story";
      newFaces.push({ id: `page-${pageNum}`, type, choices: [], isLoading: true, pageIndex: pageNum });
    });

    setComicFaces((prev) => {
      const existing = new Set(prev.map((face) => face.id));
      return [...prev, ...newFaces.filter((face) => !existing.has(face.id))];
    });
    newFaces.forEach((face) => {
      if (!historyRef.current.find((entry) => entry.id === face.id)) historyRef.current.push(face);
    });

    // Generate pages with individual error handling to prevent one failure from stopping the batch
    for (const pageNum of pagesToGen) {
      try {
        await generateSinglePage(`page-${pageNum}`, pageNum, pageNum === BACK_COVER_PAGE ? "back_cover" : "story");
      } catch (error) {
        console.error(`Error generating page ${pageNum}:`, error);
        // Mark page as failed but continue with other pages
        updateFaceState(`page-${pageNum}`, { isLoading: false });
      } finally {
        generatingPages.current.delete(pageNum);
      }
    }
  };

  const launchStory = async () => {
    const hasKey = await validateApiKey();
    const hasEnvKey = Boolean(envApiKey);
    if (!hasKey && !hasEnvKey) return;

    if (!envApiKey && !hasKey) {
      setShowApiKeyDialog(true);
      return;
    }

    if (!heroRef.current) return;
    if (selectedGenre === "Custom" && !customPremise.trim()) {
      alert("Please enter a custom story premise.");
      return;
    }

    setIsTransitioning(true);

    let availableTones = TONES;
    if (selectedGenre === "Teen Drama / Slice of Life" || selectedGenre === "Lighthearted Comedy") {
      availableTones = TONES.filter((tone) => tone.includes("CASUAL") || tone.includes("WHOLESOME") || tone.includes("QUIPPY"));
    } else if (selectedGenre === "Classic Horror") {
      availableTones = TONES.filter((tone) => tone.includes("INNER-MONOLOGUE") || tone.includes("OPERATIC"));
    }

    setStoryTone(availableTones[Math.floor(Math.random() * availableTones.length)]);

    const coverFace: ComicFace = { id: "cover", type: "cover", choices: [], isLoading: true, pageIndex: 0 };
    setComicFaces([coverFace]);
    historyRef.current = [coverFace];
    generatingPages.current.add(0);

    generateSinglePage("cover", 0, "cover").finally(() => generatingPages.current.delete(0));

    setTimeout(async () => {
      setIsStarted(true);
      setShowSetup(false);
      setIsTransitioning(false);
      setShouldContinue(null); // Reset continue state
      // Start with a small batch to get into the book quickly
      await generateBatch(1, INITIAL_PAGES);
      // Generate pages 3-4, then wait for user to decide if they want to continue
      await generateBatch(3, 2); // Generate pages 3 and 4 only
    }, 1100);
  };

  const handleChoice = async (pageIndex: number, choice: string) => {
    updateFaceState(`page-${pageIndex}`, { resolvedChoice: choice });
    const maxPage = Math.max(...historyRef.current.map((face) => face.pageIndex || 0));
    if (maxPage + 1 <= TOTAL_PAGES) {
      generateBatch(maxPage + 1, BATCH_SIZE);
    }
  };

  const handleContinue = async (continueReading: boolean) => {
    setShouldContinue(continueReading);
    if (continueReading) {
      // Continue generating from page 5
      const maxPage = Math.max(...historyRef.current.map((face) => face.pageIndex || 0));
      if (maxPage < TOTAL_PAGES) {
        generateBatch(5, BATCH_SIZE);
        // Auto-flip to next page to show loading state
        setTimeout(() => setCurrentSheetIndex((prev) => prev + 1), 500);
      }
    } else {
      // Generate Back Cover immediately so user can Mint
      const maxPage = Math.max(...historyRef.current.map((face) => face.pageIndex || 0));
      const backCoverPageNum = maxPage + 1;

      const backCoverFace: ComicFace = {
        id: `page-${backCoverPageNum}`,
        type: "back_cover",
        choices: [],
        isLoading: true,
        pageIndex: backCoverPageNum
      };

      setComicFaces((prev) => [...prev, backCoverFace]);
      historyRef.current.push(backCoverFace);

      await generateSinglePage(backCoverFace.id, backCoverPageNum, "back_cover");
      // Auto-flip to back cover
      setTimeout(() => setCurrentSheetIndex((prev) => prev + 1), 500);
    }
  };

  const resetApp = () => {
    setIsStarted(false);
    setShowSetup(true);
    setComicFaces([]);
    setCurrentSheetIndex(0);
    historyRef.current = [];
    generatingPages.current.clear();
    setHero(null);
    setFriend(null);
    setShouldContinue(null);
  };

  const downloadPDF = () => {
    const PAGE_WIDTH = 480;
    const PAGE_HEIGHT = 720;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [PAGE_WIDTH, PAGE_HEIGHT] });
    const pagesToPrint = comicFaces
      .filter((face) => face.imageUrl && !face.isLoading)
      .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    pagesToPrint.forEach((face, index) => {
      if (index > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], "portrait");
      if (face.imageUrl) doc.addImage(face.imageUrl, "JPEG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    });
    doc.save("Infinite-Heroes-Issue.pdf");
  };

  const handleHeroUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setHero({ base64, desc: "The Main Hero" });
    } catch (error) {
      alert("Hero upload failed");
    }
  };

  const handleFriendUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setFriend({ base64, desc: "The Sidekick/Rival" });
    } catch (error) {
      alert("Friend upload failed");
    }
  };

  const handleMintHero = async () => {
    if (!heroRef.current || !heroRef.current.base64) return;
    setIsMintingHero(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);

    try {
      // 1. Upload to Walrus
      console.log("Compressing image...");
      const compressedBase64 = await compressImage(heroRef.current.base64);

      console.log("Uploading to Walrus...");
      const blob = base64ToBlob(compressedBase64);
      const { blobId, blobUrl } = await uploadToWalrus(blob);
      console.log("Uploaded to Walrus:", blobId, blobUrl);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 2. Mint on Sui
      const response = await mintHero("My Hero", blobId, blobUrl);
      console.log("Hero Minted:", response);
      setHeroMinted(true);
      // Extract object ID from response if possible, or just assume success for now
      // In a real app, we'd parse the effects to get the created object ID
      // setHeroId(parsedId); 
    } catch (error) {
      console.error("Mint failed", error);
      alert("Failed to mint hero. See console.");
    } finally {
      setIsMintingHero(false);
    }
  };



  const handleMintComic = async () => {
    if (!heroMinted) {
      alert("Please mint your hero first!");
      return;
    }
    setIsMintingComic(true);
    try {
      // 1. Prepare Comic Data
      const validPages = comicFaces.filter(face => face.imageUrl && !face.isLoading);
      if (validPages.length === 0) {
        alert("No pages generated yet!");
        setIsMintingComic(false);
        return;
      }

      // OPTIMIZATION: Compress all images before upload
      console.log("Compressing comic pages...");
      const compressedPages = await Promise.all(validPages.map(async (page) => {
        let compressedUrl = page.imageUrl;
        if (page.imageUrl && page.imageUrl.startsWith("data:image")) {
          const base64 = page.imageUrl.split(",")[1];
          const compressedBase64 = await compressImage(base64);
          compressedUrl = `data:image/jpeg;base64,${compressedBase64}`;
        }
        return {
          pageIndex: page.pageIndex,
          imageUrl: compressedUrl,
          narrative: page.narrative
        };
      }));

      const comicData = {
        title: "Infinite Heroes Issue #1",
        genre: selectedGenre,
        heroId: heroId || "0x0",
        pages: compressedPages,
        timestamp: Date.now()
      };

      // 2. Upload Comic Data to Walrus
      console.log("Uploading comic data to Walrus...");
      const jsonString = JSON.stringify(comicData);
      const blob = new TextEncoder().encode(jsonString); // Convert string to Uint8Array
      const { blobId } = await uploadToWalrus(blob);
      console.log("Comic Data Uploaded:", blobId);

      // 3. Upload Cover Image to Walrus (Fix for Size Limit)
      console.log("Processing cover image...");
      const coverFace = comicFaces.find(f => f.type === "cover");
      let finalCoverUrl = "https://example.com/cover.jpg";

      if (coverFace?.imageUrl) {
        console.log("Compressing and uploading cover...");
        const base64 = coverFace.imageUrl.split(",")[1];
        const compressedCoverBase64 = await compressImage(base64);
        const coverBlob = base64ToBlob(compressedCoverBase64);
        const { blobUrl } = await uploadToWalrus(coverBlob);
        finalCoverUrl = blobUrl;
        console.log("Cover uploaded:", finalCoverUrl);
      }

      // 4. Mint Comic
      const response = await mintComic(
        heroId || "0x0", // Pass hero ID if we have it
        "Infinite Heroes Issue #1",
        selectedGenre,
        finalCoverUrl, // Use Walrus URL instead of base64
        blobId // Real Blob ID
      );
      console.log("Comic Minted:", response);
      setComicMinted(true);
      alert("Comic Minted Successfully! Blob ID: " + blobId);
    } catch (error) {
      console.error("Mint comic failed", error);
      alert("Failed to mint comic. See console.");
    } finally {
      setIsMintingComic(false);
    }
  };

  const handleSheetClick = (index: number) => {
    if (!isStarted) return;
    if (index === 0 && currentSheetIndex === 0) return;
    if (index < currentSheetIndex) setCurrentSheetIndex(index);
    else if (index === currentSheetIndex && comicFaces.find((face) => face.pageIndex === index)?.imageUrl) {
      setCurrentSheetIndex((prev) => prev + 1);
    }
  };

  const leftNote = (
    <div>
      <div className="note-title">Quick tip</div>
      <div className="note-text">Swipe/scroll to flip pages. Choices steer the plot.</div>
    </div>
  );

  const rightNote = (
    <div>
      <div className="note-title">Need help?</div>
      <div className="note-text">Upload a hero image to start, then tap “Read Comics”.</div>
    </div>
  );

  return (
    <div className="comics-shell">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />}
      <NoteOverlay leftNote={leftNote} rightNote={rightNote} />

      <Setup
        show={showSetup}
        isTransitioning={isTransitioning}
        hero={hero}
        friend={friend}
        selectedGenre={selectedGenre}
        selectedLanguage={selectedLanguage}
        selectedStory={selectedStory}
        customPremise={customPremise}
        richMode={richMode}
        onHeroUpload={handleHeroUpload}
        onFriendUpload={handleFriendUpload}
        onGenreChange={setSelectedGenre}
        onLanguageChange={setSelectedLanguage}
        onStoryChange={setSelectedStory}
        onPremiseChange={setCustomPremise}
        onRichModeChange={setRichMode}
        onLaunch={launchStory}
        onMintHero={handleMintHero}
        isMinting={isMintingHero}
        heroMinted={heroMinted}
        uploadProgress={uploadProgress}
      />

      <div className="comic-scene">
        <Book
          comicFaces={comicFaces}
          currentSheetIndex={currentSheetIndex}
          isStarted={isStarted}
          isSetupVisible={showSetup && !isTransitioning}
          onSheetClick={handleSheetClick}
          onChoice={handleChoice}
          onOpenBook={() => setCurrentSheetIndex(1)}
          onDownload={downloadPDF}
          onReset={resetApp}
          onMintComic={handleMintComic}
          isMintingComic={isMintingComic}
          comicMinted={comicMinted}
          onContinue={handleContinue}
          shouldContinue={shouldContinue}
        />
      </div>
    </div>
  );
};
