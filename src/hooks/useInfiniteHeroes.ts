import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { networkConfig } from "../config";
import { useTestAccount, useTestSignAndExecute } from "./useTestWallet";
import { base64UrlToBigInt } from "../utils/walrus";

export const useInfiniteHeroes = () => {
    const client = useSuiClient();
    const account = useTestAccount();
    const { mutateAsync: signAndExecute } = useTestSignAndExecute();

    const mintHero = async (name: string, blobId: string, metadataUrl: string) => {
        if (!account) throw new Error("Wallet not connected");

        const tx = new Transaction() as any;

        // 0. Create Url
        const url = tx.moveCall({
            target: `0x2::url::new_unsafe_from_bytes`,
            arguments: [tx.pure.string(metadataUrl)],
        });

        // 1. Create the Hero
        // public fun create(name: String, source_blob_id: u256, metadata_url: Url, ctx: &mut TxContext): HeroAsset
        const hero = tx.moveCall({
            target: `${networkConfig.packageId}::hero_asset::create`,
            arguments: [
                tx.pure.string(name),
                tx.pure.u256(base64UrlToBigInt(blobId)),
                url,
            ],
        });

        // 2. Create a Kiosk
        const [kiosk, kioskOwnerCap] = tx.moveCall({
            target: `0x2::kiosk::new`,
        });

        // 3. Place Hero in Kiosk
        // public fun place_in_kiosk(hero: HeroAsset, kiosk: &mut Kiosk, kiosk_cap: &KioskOwnerCap, policy: &TransferPolicy<HeroAsset>, _ctx: &mut TxContext)
        tx.moveCall({
            target: `${networkConfig.packageId}::hero_asset::place_in_kiosk`,
            arguments: [
                hero,
                kiosk,
                kioskOwnerCap,
                tx.object(networkConfig.heroPolicy),
            ],
        });

        // 4. Share/Transfer Kiosk and Cap
        tx.moveCall({
            target: `0x2::transfer::public_share_object`,
            arguments: [kiosk],
            typeArguments: ["0x2::kiosk::Kiosk"],
        });

        tx.transferObjects([kioskOwnerCap], tx.pure.address(account.address));

        const response = await signAndExecute({
            transaction: tx,
        });

        return response;
    };

    const mintComic = async (
        heroId: string, // Not strictly used in mint args but good for context if we link it
        title: string,
        genre: string,
        coverUrl: string,
        blobId: string
    ) => {
        if (!account) throw new Error("Wallet not connected");

        const tx = new Transaction() as any;

        // 1. Create Series
        // public fun create(title: String, genre: String, ctx: &mut TxContext): ComicSeries
        const series = tx.moveCall({
            target: `${networkConfig.packageId}::comic_series::create`,
            arguments: [tx.pure.string(title), tx.pure.string(genre)],
        });

        // 2. Increment Issue Count
        // public fun increment_issue_count(series: &mut ComicSeries): u64
        const issueNum = tx.moveCall({
            target: `${networkConfig.packageId}::comic_series::increment_issue_count`,
            arguments: [series],
        });

        // 3. Create Url for Cover
        const coverUrlObj = tx.moveCall({
            target: `0x2::url::new_unsafe_from_bytes`,
            arguments: [tx.pure.string(coverUrl)],
        });

        // 4. Create Comic Issue
        // public fun create(series_id: ID, issue_number: u64, title: String, cover_url: Url, walrus_blob_id: u256, hero_origin_id: Option<ID>, mode: String, ctx: &mut TxContext): ComicIssue
        // Note: We need series_id. We can get it from the series object? No, we need to pass the ID.
        // Wait, `create` takes `series_id: ID`. We can't easily get the ID of the object we just created in the same PTB to pass as a pure value?
        // Actually, we can pass the object itself if the function expected `&ComicSeries`, but it expects `ID`.
        // Workaround: We can't get the ID of a newly created object in the same PTB to pass as an argument to another move call that expects `ID` (unless we have a helper).
        // HOWEVER, `comic_issue::create` takes `series_id: ID`.
        // Let's look at `comic_series.move` again. `link_issue` takes `&mut ComicSeries`.
        // Does `comic_issue::create` strictly require `series_id`? Yes.
        // FIX: I might need to change the contract to accept `&ComicSeries` or I have to do this in two transactions?
        // OR, I can use `object::id` in a move call? `0x2::object::id` takes `&T`.

        // Let's try to get the ID using `0x2::object::id`.
        const seriesId = tx.moveCall({
            target: `0x2::object::id`,
            arguments: [series],
            typeArguments: [`${networkConfig.packageId}::comic_series::ComicSeries`]
        });

        const issue = tx.moveCall({
            target: `${networkConfig.packageId}::comic_issue::create`,
            arguments: [
                seriesId,
                issueNum,
                tx.pure.string(title),
                coverUrlObj,
                tx.pure.u256(base64UrlToBigInt(blobId)),
                tx.pure.option("address", null), // hero_origin_id (Option<ID>). passing null for now or we need to wrap the heroId
                tx.pure.string("Standard"), // mode
            ],
        });

        // 5. Link Issue to Series
        // public fun link_issue(series: &mut ComicSeries, issue_number: u64, issue_id: ID)
        const issueId = tx.moveCall({
            target: `0x2::object::id`,
            arguments: [issue],
            typeArguments: [`${networkConfig.packageId}::comic_issue::ComicIssue`]
        });

        tx.moveCall({
            target: `${networkConfig.packageId}::comic_series::link_issue`,
            arguments: [series, issueNum, issueId],
        });

        // 6. Create Kiosk for Comic
        const [kiosk, kioskOwnerCap] = tx.moveCall({
            target: `0x2::kiosk::new`,
        });

        // 7. Lock Comic in Kiosk
        // public fun lock<T: key + store>(self: &mut Kiosk, cap: &KioskOwnerCap, policy: &TransferPolicy<T>, item: T)
        tx.moveCall({
            target: `0x2::kiosk::lock`,
            arguments: [
                kiosk,
                kioskOwnerCap,
                tx.object(networkConfig.comicPolicy),
                issue,
            ],
            typeArguments: [`${networkConfig.packageId}::comic_issue::ComicIssue`],
        });

        // 7. Share Kiosk and Transfer Caps
        tx.moveCall({
            target: `0x2::transfer::public_share_object`,
            arguments: [kiosk],
            typeArguments: ["0x2::kiosk::Kiosk"],
        });

        tx.transferObjects([kioskOwnerCap, series], tx.pure.address(account.address));

        const response = await signAndExecute({
            transaction: tx,
        });

        return response;
    };

    return { mintHero, mintComic };
};
