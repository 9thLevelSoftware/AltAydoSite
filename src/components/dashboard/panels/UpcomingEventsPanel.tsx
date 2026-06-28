'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import MobiGlasPanel from '@/components/ui/mobiglas/MobiGlasPanel';
import { useEvents } from '@/hooks/useEvents';
import { EventData, EventType } from '@/lib/eventMapper';

const UpcomingEventsPanel = () => {
  const router = useRouter();
  const { events: eventsData, loading, error } = useEvents();

  // Filter events occuring within the next 7 days
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime());
  sevenDaysOut.setDate(now.getDate() + 7);

  const events: EventData[] = eventsData
    .filter((e) => e.date >= now && e.date <= sevenDaysOut)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  // Get event type icon
  const getEventIcon = (type: EventType) => {
    switch (type) {
      case EventType.General:
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case EventType.AydoExpress:
        return 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z';
      case EventType.EmpyrionIndustries:
        return 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222';
      case EventType.MidnightSecurity:
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      default:
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  // Icon for the panel header
  const headerIcon = (
    <div className="w-5 h-5 relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );

  // Right content for the panel header
  const headerRight = (
    <div className="text-xs text-[rgba(var(--mg-text),0.6)]">
      <span>NEXT 7 DAYS</span>
    </div>
  );

  return (
    <MobiGlasPanel
      title="UPCOMING EVENTS"
      icon={headerIcon}
      rightContent={headerRight}
      animationDelay={0.2}
      accentColor="primary"
      corners={['tl', 'br']}
    >
      <div className="space-y-3">
        {loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-8 text-[rgba(var(--mg-text),0.6)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 animate-spin text-[rgba(var(--mg-primary),0.8)]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth={3}
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="mt-3 text-xs font-quantify tracking-wider">LOADING EVENTS...</span>
          </div>
        ) : error ? (
          /* Error state */
          <div className="text-center py-8">
            <div className="text-[rgba(var(--mg-danger),0.8)] mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="mg-subtitle text-sm text-[rgba(var(--mg-danger),0.9)]">
              UNABLE TO LOAD EVENTS
            </p>
            <p className="text-xs text-[rgba(var(--mg-text),0.5)] mt-1">{error}</p>
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="text-center py-8">
            <div className="mg-text opacity-60 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="mg-subtitle text-sm">No upcoming events</p>
            <p className="text-xs text-[rgba(var(--mg-text),0.5)] mt-1">
              Nothing scheduled in the next 7 days
            </p>
          </div>
        ) : (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              className="bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] rounded-sm overflow-hidden cursor-pointer hover:border-[rgba(var(--mg-primary),0.3)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => router.push(`/dashboard/events?eventId=${event.id}`)}
            >
              {/* Event header */}
              <div className="flex items-center px-3 py-2 border-b border-[rgba(var(--mg-primary),0.1)]">
                <div className="mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[rgba(var(--mg-text),0.7)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={getEventIcon(event.type)}
                    />
                  </svg>
                </div>
                <div className="flex-grow font-quantify text-sm text-[rgba(var(--mg-primary),0.9)]">
                  {event.title}
                </div>
              </div>

              {/* Event details */}
              <div className="p-2 text-xs">
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 mr-1 opacity-70">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-[rgba(var(--mg-text),0.7)]">
                      {event.date.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 mr-1 opacity-70">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-[rgba(var(--mg-text),0.7)]">{event.time}</span>
                  </div>
                </div>
                {/* Location removed per request */}
              </div>
            </motion.div>
          ))
        )}

        {/* Calendar button */}
        <motion.button
          className="w-full mt-2 py-2 px-3 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] rounded-sm text-sm text-[rgba(var(--mg-primary),0.9)] font-quantify tracking-wide flex items-center justify-center"
          whileHover={{
            backgroundColor: 'rgba(var(--mg-primary), 0.15)',
            borderColor: 'rgba(var(--mg-primary), 0.4)',
            boxShadow: '0 0 10px rgba(var(--mg-primary), 0.1)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => router.push('/dashboard/events')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          VIEW FULL CALENDAR
        </motion.button>
      </div>
    </MobiGlasPanel>
  );
};

export default UpcomingEventsPanel;
