"use client";

import Countdown from "./Countdown";

export interface Award {
  id: string;
  title: string;
  view_node: string;
  field_date: string;
  startDate?: string | null;
  endDate?: string | null;
  image?: string;
  brand?: string;
  field_event_category?: string;
  field_redirect_to?: string;
  created?: string;
}

interface AwardsGridProps {
  awards: Award[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AwardCountdown({ awards }: AwardsGridProps) {
  const now = new Date();

  /*
const upcomingAwards = awards.filter(
  award => new Date(award.field_date) > now
);
*/
  // 🔽 Use this instead if you only want the earliest upcoming award
  const upcomingAwards =
    awards
      ?.filter(
        (award): award is Award =>
          !!award && !!award.field_date && !isNaN(new Date(award.field_date).getTime())
      )
      .filter(award => new Date(award.field_date) > now)
      .sort(
        (a, b) =>
          new Date(a.field_date).getTime() -
          new Date(b.field_date).getTime()
      )
      .slice(0, 1) ?? [];

  if (!upcomingAwards.length) return null;
  
  return (
    <div className="award-countdown flex-col md:flex-row gap-4 justify-center h-full text-lg text-gray-900">

      {upcomingAwards.map((award, idx) => (
        <div key={award.id || award.view_node || idx} className="text-left flex flex-col gap-4">

          {/* Award Title + Image */}
          <div className="flex flex-col items-center justify-start">
            {award.image && (
              <img
                src={award.image}
                alt={award.title}
                className="award-logo w-50 h-50 object-contain"
              />
            )}
            {/* <p>{award.title}</p> */}
          </div>

          {/* Nomination countdowns (stacked on desktop, row on landscape phones) */}
          <div className="award-times flex flex-col gap-4">
            {/* Nomination Opens */}
            <div className="">
              <p className="text-sm text-gray-700">Nomination Opens</p>
              <Countdown
                target={award.startDate}
                done="Nomination Opened"
              />
            </div>

            {/* Nomination Closes */}
            <div className="">
              <p className="text-sm text-gray-700">Nomination Closes</p>
              <Countdown
                target={award.endDate}
                done="Nomination Closed"
              />
            </div>

            {/* Awards Presentation */}
            <div className="">
              <p className="text-sm text-gray-700">Awards Presentation</p>
              <Countdown
                target={award.field_date}
                done="Awards Finished"
              />
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
