import React, { useRef, useState } from "react";
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
  TONES,
  TOTAL_PAGES,
} from "./types";
import { Setup } from "./Setup";
import { Book } from "./Book";
import { useApiKey } from "./useApiKey";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { NoteOverlay } from "./NoteOverlay";
import "./comics.css";

const MODEL_IMAGE_GEN_NAME = "gemini-3-pro-image-preview";
const MODEL_TEXT_NAME = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-image";
const FAILURE_THRESHOLD = 3;

// --- SUI STORY DATA ---
const SUI_STORY_SEGMENTS = [
  `
# The Phoenix of Web3: The Story of Sui

## I. The Exodus
In 2021, five engineers made a decision that baffled the industry. They walked away from Facebook (Meta)—a company offering unlimited resources and job security—to chase a vision the world wasn't ready for yet.

They weren't just leaving a job; they were carrying the torch of an extinguished dream.

Years prior, Mark Zuckerberg had sat before Congress, enduring hours of grilling over Facebook’s "Libra" (later Diem) project. Politicians mocked it as "Zuck Bucks," fearing a corporate takeover of the financial system. Under unbearable pressure, Facebook shut the project down.

**The project died, but the innovation survived.**

The engineers realized that while the *politics* of Libra were flawed, the *technology* they had built was revolutionary. They had created a new programming language, a new virtual machine, and a scalable architecture that was too powerful to let gather dust on a corporate shelf.

## II. Rising from the Ashes
The "Fantastic Five" (the founding team of Mysten Labs) looked at the wreckage of Diem and saw the blueprint for a new internet. They decided to resurrect the original vision, but with a critical pivot in philosophy:

* **Libra was Permissioned** (Controlled by a few) → **Sui is Permissionless** (Open to all).
* **Libra was for Payments** → **Sui is for Everything.**
* **Libra was Closed** → **Sui is Open Source.**

They weren't interested in copying Ethereum or chasing the latest crypto hype. They wanted to do for Web3 what Tim Berners-Lee did for the World Wide Web: create an open, scalable foundation that belongs to everyone.

## III. The Broken Web & The "Patchwork" Problem
Why go through the trouble of building a new Layer 1 blockchain from scratch?

The founders looked at the current state of the internet and saw "walled gardens." Corporations own your data, take the majority of creator revenue, and lock digital items inside specific ecosystems.

To fix this, they needed a blockchain that moved at the speed of the internet. However, they identified two distinct categories of failure in existing blockchains:

1.  **Blockchain-centric issues:** Slow execution, high fees, and bottlenecks.
2.  **Language-centric issues:** Smart contract bugs and poor safety guarantees.

Most networks focus on the first and ignore the second. But users don't care *why* they lost money—whether the blockchain stalled or a contract was hacked—**loss is loss.**

## IV. The Secret Weapon: Move
The team knew that building a faster car is useless if the engine catches fire. Sam Blackshear, one of the founders, had analyzed thousands of bugs at Facebook. His conclusion? **"Code always does exactly what you tell it to do."**

The problem wasn't usually human error; it was that existing languages (like Solidity) made it too easy to make mistakes. This led to the creation of **Move**.

### The Cautionary Tale: The DAO Hack
To understand why Move matters, look at the history of Ethereum. On June 17, 2016, The DAO was hacked for 3.6 million ETH (billions in today's value).

It was a **Re-Entrancy Attack**.
* **The Flaw:** A contract sent money before updating its balance sheet.
* **The Exploit:** The hacker kept asking for withdrawals repeatedly before the contract realized it was empty.

In traditional blockchain development, developers copy-paste code because there is no safe, modular way to share libraries. Every time code is copied, vulnerabilities spread like a virus.

### The Move Solution
Sui and Move eliminate these issues at the root:
* **Safety by Default:** Move uses strict typing and formal verification (Move Prover) to ensure code behaves as intended.
* **Write Less Code:** Move allows for native packages and shared libraries ("fix once, update everywhere").
* **No Re-Entrancy:** The architecture makes the specific class of bugs that destroyed The DAO impossible by design.

## V. Synergy: When Language Meets Speed
The genius of Sui lies in the equation: **Language + Infrastructure = Speed.**

In older blockchains, transactions are processed sequentially (one after another). If 10,000 people try to mint an NFT, the whole chain freezes.

Because Move is **object-centric**, Sui can look at transactions and see which ones are related.
* If Alice sends money to Bob, and Charlie plays a game, those two actions don't touch the same objects.
* Therefore, Sui executes them **in parallel.**

This is the breakthrough. By fixing the language, they unlocked massive parallel throughput, solving the scalability trilemma without sacrificing security.

## VI. The New Horizon
Sui is not just another chain; it is a correction of the mistakes of the past decade.

It is building a world where creators own their work, assets move freely between games and apps, and finance operates at the speed of light.

From the ashes of a failed corporate project, the engineers built a public utility. The story of Sui is the story of taking the lessons of failure and turning them into the infrastructure of the future.
`
];

export const ComicsApp: React.FC = () => {
  const { validateApiKey, setShowApiKeyDialog, showApiKeyDialog, handleApiKeyDialogContinue } = useApiKey();
  const [hero, setHeroState] = useState<Persona | null>(null);
  const [friend, setFriendState] = useState<Persona | null>(null);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].code);
  const [customPremise, setCustomPremise] = useState("");
  const [storyTone, setStoryTone] = useState(TONES[0]);
  const [richMode, setRichMode] = useState(true);
  const [comicFaces, setComicFaces] = useState<ComicFace[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const heroRef = useRef<Persona | null>(null);
  const friendRef = useRef<Persona | null>(null);
  const generatingPages = useRef(new Set<number>());
  const historyRef = useRef<ComicFace[]>([]);
  const modelRef = useRef(MODEL_IMAGE_GEN_NAME);
  const failureRef = useRef(0);

  const envApiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_API_KEY;

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
      const segmentText = SUI_STORY_SEGMENTS[segmentIndex] || "The story continues into the future...";
      
      const prompt = `
You are a master visual storyteller adapting a historical tech narrative into a comic book.
PAGE ${pageNum} of ${MAX_STORY_PAGES}.
SOURCE TEXT:
"""
${segmentText}
"""

INSTRUCTIONS:
1. ADAPTATION: Convert the SOURCE TEXT into a SINGLE comic panel.
2. SCENE: Describe a visual metaphor or literal scene that represents the text.
   - If the text mentions "Engineers" or "Builders", use the visual of the HERO (refer to them as [HERO] in the scene description).
   - If the text mentions "Mark Zuckerberg", "Corporations", "Old Web", or "Vulnerabilities/Bugs", use the visual of the CO-STAR (refer to them as [CO-STAR]).
3. TEXT: Create a CAPTION that summarizes the key point. Optionally add DIALOGUE if characters are speaking in the text.
4. LANGUAGE: Output in ${langName}.

OUTPUT JSON ONLY:
{
  "caption": "Narrative text in ${langName} based on source.",
  "dialogue": "Optional speech in ${langName}.",
  "scene": "Visual description. Use [HERO] for protagonists/Sui team, [CO-STAR] for antagonists/Old Web/Bugs.",
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

    const historyText = relevantHistory
      .map(
        (panel) =>
          `[Page ${panel.pageIndex}] [Focus: ${panel.narrative?.focus_char}] (Caption: "${panel.narrative?.caption || ""}") (Dialogue: "${
            panel.narrative?.dialogue || ""
          }") (Scene: ${panel.narrative?.scene}) ${
            panel.resolvedChoice ? `-> USER CHOICE: "${panel.resolvedChoice}"` : ""
          }`,
      )
      .join("\n");

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

    let instruction = `Continue the story. ALL OUTPUT TEXT (Captions, Dialogue, Choices) MUST BE IN ${langName.toUpperCase()}. ${coreDriver} ${guardrails}`;
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
        instruction += " RISING ACTION. The heroes engage with the new situation.";
      } else if (pageNum <= 8) {
        instruction += " COMPLICATION. A twist occurs! A secret is revealed or the path is blocked.";
      } else {
        instruction += " CLIMAX. The confrontation with the main conflict.";
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
1. NO REPETITION.
2. IF CO-STAR IS ACTIVE, THEY MUST APPEAR FREQUENTLY.
3. LANGUAGE: All user-facing text MUST be in ${langName}.

INSTRUCTION: ${instruction}

OUTPUT STRICT JSON ONLY:
{
  "caption": "Unique narrator text in ${langName}. (${capLimit}).",
  "dialogue": "Unique speech in ${langName}. (${diaLimit}). Optional.",
  "scene": "Vivid visual description (ALWAYS IN ENGLISH for the artist model). MUST mention 'HERO' or 'CO-STAR' if they are present.",
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

      return parsed as Beat;
    } catch (error) {
      console.error("Beat generation failed", error);
      handleAPIError(error);
      return { caption: pageNum === 1 ? "It began..." : "...", scene: `Generic scene for page ${pageNum}.`, focus_char: "hero", choices: [] };
    }
  };

  const generatePersona = async (desc: string): Promise<Persona> => {
    const style = selectedGenre === "Custom" || selectedGenre === "Sui Origin Story" ? "Modern American comic book art" : `${selectedGenre} comic`;
    try {
      const response = await runModel({
        contents: { text: `STYLE: Masterpiece ${style} character sheet, detailed ink, neutral background. FULL BODY. Character: ${desc}` },
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




  // PROMPT 2: Enhanced Global Instructions (applies to ALL image types)
  // const generateImage = async (beat: Beat, type: ComicFace["type"]): Promise<string> => {
  //   const contents: any[] = [];
  
  //   // Push reference images
  //   if (heroRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 1 [HERO]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: heroRef.current.base64 } });
  //   }
  //   if (friendRef.current?.base64) {
  //     contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
  //     contents.push({ inlineData: { mimeType: "image/jpeg", data: friendRef.current.base64 } });
  //   }
  
  //   // Style + Era
  //   const styleEra =
  //     selectedGenre === "Custom" || selectedGenre === "Sui Origin Story"
  //       ? "Modern High-Fidelity Graphic Novel"
  //       : selectedGenre;
  
  //   let promptText = `STYLE: ${styleEra}, high-detail line art, realistic anatomy, cinematic lighting, consistent color grading. `;
  
  //   // ============================================================
  //   // ENHANCED GLOBAL INSTRUCTIONS (applies to ALL image types)
  //   // ============================================================
  //   const GLOBAL_ENHANCE = `
  // ART DIRECTION:
  // - Ultra-sharp line art, realistic anatomy, polished shading.
  // - Cinematic lighting consistent between panels.
  // - No distortion of faces or bodies.
  
  // CHARACTER BIBLE:
  // - HERO: Maintain strict likeness with REFERENCE 1 (facial structure, hairstyle, vibe, skin tone).
  // - CO-STAR: Maintain likeness with REFERENCE 2.
  // - Do NOT age, deform, or alter facial structure unless explicitly stated.
  
  // SCENE CONTINUITY:
  // - Keep outfits, lighting, props, injuries, and environment consistent.
  // - Maintain continuity with previous panels even if not shown.
  // - Character physical placement must follow logical spatial movement.
  
  // CAMERA DIRECTION:
  // - Use cinematic angles: low-angle, over-the-shoulder, medium shot, dynamic framing.
  // - Apply depth-of-field when appropriate.
  
  // ENVIRONMENT RULES:
  // - Background must remain consistent unless script explicitly changes.
  // - No random new elements.
  
  // EMOTION CONTROL:
  // - Expressions must reflect the emotional tone of the scene.
  // - Use subtle micro-expressions for realism.
  
  // PANEL COMPOSITION:
  // - Clean framing, avoid clutter.
  // - Do NOT cover character faces with speech bubbles or captions.
  // - Clear silhouette readability.
  
  // GENERAL RULES:
  // - Maintain strict character likeness with references at all times.
  // - High visual logic: no teleporting, no inconsistent props, no changing outfits unless stated.
  // `;
  
  //   // ============================================================
  //   // TYPE: COVER / BACK COVER / PANEL
  //   // ============================================================
  //   if (type === "cover") {
  //     const langName =
  //       LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
  //     const title =
  //       selectedGenre === "Sui Origin Story" ? "SUI: THE ORIGIN" : "INFINITE HEROES";
  
  //     promptText += `
  // TYPE: Comic Book Cover.
  // TITLE: "${title}" (OR TRANSLATION IN ${langName.toUpperCase()}).
  // Main visual: Dynamic, high-impact action shot of [HERO] using REFERENCE 1.
  // Full detail, dramatic lighting, poster-quality composition.
  // ${GLOBAL_ENHANCE}
  //     `;
  //   }
  
  //   else if (type === "back_cover") {
  //     promptText += `
  // TYPE: Comic Back Cover.
  // FULL PAGE VERTICAL ART.
  // Dramatic teaser tone. Include small teaser text: "NEXT ISSUE SOON".
  // Poster-like, emotional atmosphere.
  // ${GLOBAL_ENHANCE}
  //     `;
  //   }
  
  //   else {
  //     // PANEL GENERATION (Main)
  //     promptText += `
  // TYPE: Vertical comic panel.
  
  // SCENE DESCRIPTION:
  // ${beat.scene}
  
  // INSTRUCTIONS:
  // - Maintain strict likeness for any mention of HERO (use REFERENCE 1).
  // - Maintain strict likeness for any mention of CO-STAR/SIDEKICK (use REFERENCE 2).
  // - Render the action logically and cinematically.
  
  // ${beat.caption ? `CAPTION BOX: "${beat.caption}".` : ""}
  // ${beat.dialogue ? `SPEECH BUBBLE: "${beat.dialogue}".` : ""}
  
  // ${GLOBAL_ENHANCE}
  //     `;
  //   }
  
  //   contents.push({ text: promptText });
  
  //   // ============================================================
  //   // EXECUTE MODEL
  //   // ============================================================
  //   try {
  //     const response = await runModel({
  //       contents,
  //       model: MODEL_IMAGE_GEN_NAME,
  //       config: {
  //         imageConfig: {
  //           aspectRatio: "2:3", // comic vertical
  //         },
  //       },
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


  // PROMPT 3
  const generateImage = async (beat: Beat, type: ComicFace["type"]): Promise<string> => {
    const contents: any[] = [];
  
    // ---------------------------------------------
    // Attach reference images
    // ---------------------------------------------
    if (heroRef.current?.base64) {
      contents.push({ text: "REFERENCE 1 [HERO]:" });
      contents.push({ inlineData: { mimeType: "image/jpeg", data: heroRef.current.base64 } });
    }
    if (friendRef.current?.base64) {
      contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
      contents.push({ inlineData: { mimeType: "image/jpeg", data: friendRef.current.base64 } });
    }
  
    // ---------------------------------------------
    // 1) STYLE ANCHOR (from your reference prompts)
    // ---------------------------------------------
    const STYLE_ANCHORS = {
      "Modern High-Fidelity Graphic Novel": `
        Comic book art style, bold ink lines, vivid coloring, cel-shaded, dynamic composition,
        high detail, cinematic lighting
      `,
      "Manga": `
        Manga art style, black and white, screentones, ink wash, high contrast,
        intricate linework, dramatic angles
      `,
      "Noir": `
        Graphic novel style, Frank Miller aesthetic, chiaroscuro lighting,
        heavy shadows, limited palette (black/white/red)
      `
    };
  
    const styleEra =
      selectedGenre === "Custom"
        ? "Modern High-Fidelity Graphic Novel"
        : selectedGenre === "Sui Origin Story"
        ? "Modern High-Fidelity Graphic Novel"
        : selectedGenre;
  
    const styleAnchor = STYLE_ANCHORS[styleEra as keyof typeof STYLE_ANCHORS] || STYLE_ANCHORS["Modern High-Fidelity Graphic Novel"];
  
    let promptText = `
  STYLE ANCHOR:
  ${styleAnchor}
  
  GLOBAL ART RULES:
  - Ultra-sharp line art, realistic anatomy.
  - Cinematic lighting consistent between panels.
  - Dynamic framing and camera movement.
  - No distortions, no surreal warping.
  - Consistent outfits, lighting, props, injuries.
  - Maintain strict likeness to reference images.
  
  CHARACTER CONTINUITY:
  - HERO: Must ALWAYS match REFERENCE 1 (facial structure, hairstyle, vibe).
  - CO-STAR: Must ALWAYS match REFERENCE 2.
  - Do NOT alter age, facial anatomy, hair, or body type.
  
  ENVIRONMENT CONTINUITY:
  - Keep backgrounds consistent unless the script explicitly changes scenes.
  - No random props or sudden environmental changes.
  
  CAMERA DIRECTION:
  - Use cinematic angles (OTS, low-angle, wide shot, close-up).
  - Depth-of-field optional but should enhance drama.
  
  PANEL COMPOSITION:
  - Clean, readable silhouettes.
  - Speech bubbles MUST NOT cover faces.
    `;
  
    // ---------------------------------------------
    // 2) TYPE-SPECIFIC PROMPT BUILDING
    // ---------------------------------------------
    if (type === "cover") {
      const langName =
        LANGUAGES.find((language) => language.code === selectedLanguage)?.name || "English";
      const title =
        selectedGenre === "Sui Origin Story" ? "SUI: THE ORIGIN" : "INFINITE HEROES";
  
      promptText += `
  TYPE: Comic Book Cover
  TITLE: "${title}" (or translated into ${langName.toUpperCase()})
  Main Visual: High-impact action portrait of HERO using REFERENCE 1.
  Epic pose. Cinematic lighting. Poster composition.
  AR: 3:2
      `;
    }
  
    else if (type === "back_cover") {
      promptText += `
  TYPE: Back Cover
  Vertical full-page art.
  Dramatic atmosphere, teaser tone.
  Include small text: "NEXT ISSUE SOON".
  AR: 2:3
      `;
    }
  
    else {
      // ---------------------------------------------
      // 3) SCENE PANEL TYPES (Your Phase 3 integrations)
      // ---------------------------------------------
  
      // Apply your extended templates
      promptText += `
  TYPE: Comic Panel
  
  SCENE DESCRIPTION:
  ${beat.scene}
  
  LOGIC REQUIREMENTS:
  - Follow physical and story continuity.
  - If scene includes HERO -> use REFERENCE 1.
  - If scene includes CO-STAR or SIDEKICK -> use REFERENCE 2.
  
  ${beat.caption ? `CAPTION BOX: "${beat.caption}"` : ""}
  ${beat.dialogue ? `SPEECH BUBBLE: "${beat.dialogue}"` : ""}
  
  ---
  
  OPTIONAL SCENE ENHANCEMENTS (AI chooses best fit):
  
  1) ACTION PANEL MODE:
  - Close-up or dynamic medium shot.
  - Motion lines, dramatic rim lighting.
  
  2) SPLIT-SCREEN MODE (Dialogue Scenes):
  - Left: HERO expression matching emotion.
  - Right: CO-STAR expression reacting logically.
  - Lightning bolt / energy divide if tension is high.
  
  3) FULL PAGE MINI-LAYOUT MODE:
  - Up to 3 micro-panels inside one frame if story benefits.
  - Clean gutters, clear storytelling.
  
  ---
  
  COMPOSITION:
  - Clear silhouette focus.
  - Keep faces unobstructed.
  - Lighting matches mood of the narrative.
      `;
    }
  
    contents.push({ text: promptText });
  
    // ---------------------------------------------
    // Execute Model
    // ---------------------------------------------
    try {
      const response = await runModel({
        contents,
        model: MODEL_IMAGE_GEN_NAME,
        config: {
          imageConfig: { aspectRatio: "2:3" }
        }
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

  const updateFaceState = (id: string, updates: Partial<ComicFace>) => {
    setComicFaces((prev) => prev.map((face) => (face.id === id ? { ...face, ...updates } : face)));
    const index = historyRef.current.findIndex((face) => face.id === id);
    if (index !== -1) historyRef.current[index] = { ...historyRef.current[index], ...updates };
  };

  const generateSinglePage = async (faceId: string, pageNum: number, type: ComicFace["type"]) => {
    // Determine if decision page (disabled for Sui story)
    const isSui = selectedGenre === "Sui Origin Story";
    const isDecision = !isSui && DECISION_PAGES.includes(pageNum);
    let beat: Beat = { scene: "", choices: [], focus_char: "other" };

    if (type === "cover") {
      // Cover beat handled in generateImage
    } else if (type === "back_cover") {
      beat = { scene: "Thematic teaser image", choices: [], focus_char: "other" };
    } else {
      beat = await generateBeat(historyRef.current, pageNum % 2 === 0, pageNum, isDecision);
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
    const url = await generateImage(beat, type);
    updateFaceState(faceId, { imageUrl: url, isLoading: false });
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

    try {
      for (const pageNum of pagesToGen) {
        await generateSinglePage(`page-${pageNum}`, pageNum, pageNum === BACK_COVER_PAGE ? "back_cover" : "story");
        generatingPages.current.delete(pageNum);
      }
    } catch (error) {
      console.error("Batch generation error", error);
    } finally {
      pagesToGen.forEach((page) => generatingPages.current.delete(page));
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
      // Start with a small batch to get into the book quickly
      await generateBatch(1, INITIAL_PAGES);
      generateBatch(3, BATCH_SIZE);
    }, 1100);
  };

  const handleChoice = async (pageIndex: number, choice: string) => {
    updateFaceState(`page-${pageIndex}`, { resolvedChoice: choice });
    const maxPage = Math.max(...historyRef.current.map((face) => face.pageIndex || 0));
    if (maxPage + 1 <= TOTAL_PAGES) {
      generateBatch(maxPage + 1, BATCH_SIZE);
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
      <div className="note-text">Upload a hero image to start, then tap “Read Issue #1”.</div>
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
        customPremise={customPremise}
        richMode={richMode}
        onHeroUpload={handleHeroUpload}
        onFriendUpload={handleFriendUpload}
        onGenreChange={setSelectedGenre}
        onLanguageChange={setSelectedLanguage}
        onPremiseChange={setCustomPremise}
        onRichModeChange={setRichMode}
        onLaunch={launchStory}
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
        />
      </div>
    </div>
  );
};
