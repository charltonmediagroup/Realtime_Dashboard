import {
  fetchAllAudiences,
  fetchLeadSourceMovement,
} from "@/src/lib/sources/mailchimp";
import MailchimpLeaderboard from "./MailchimpLeaderboard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const WINDOW_DAYS = 7;

export default async function MailchimpPage() {
  try {
    const [audiences, movement] = await Promise.all([
      fetchAllAudiences(),
      fetchLeadSourceMovement(WINDOW_DAYS),
    ]);
    return (
      <MailchimpLeaderboard
        audiences={audiences}
        engagement={audiences}
        movement={movement}
      />
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center px-6">
        <div className="rounded border border-red-300 bg-red-50 p-6 text-red-800 text-sm max-w-xl">
          {message}
        </div>
      </div>
    );
  }
}
