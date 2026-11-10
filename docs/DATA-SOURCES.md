# Data sources and prediction model

Reviewed 6 November 2026 against the official providers.

TfL Unified API: https://api.tfl.gov.uk and https://tfl.gov.uk/info-for/open-data-users/.
StopPoint search resolves hub children to the selected transport mode. Stop
details carry route IDs and coordinates; arrivals carry provider timestamps,
destinations, directions and platform names. Line/Mode status supplies network
disruption descriptions. TfL API keys are optional at public request limits;
configured subscription keys remain server-side. Requests are bounded, cached
briefly and made only to the fixed provider host.

National Rail Darwin:
https://www.nationalrail.co.uk/developers/darwin-data-feeds/
https://lite.realtime.nationalrail.co.uk/OpenLDBWS/documentation.aspx

The 2021-11-01 OpenLDBWS SOAP adapter uses ldb12.asmx and
GetDepBoardWithDetails, 9 services in a 119-minute window, with destination CRS
filtering and a second check of returned destinations/calling points. A licensed
Darwin token is required. TfL services and National Rail are distinct providers;
not every London rail service has TfL arrival predictions. No credentialed live
Darwin acceptance is claimed without an actual token. The parser is tested with
synthetic provider XML. Planned/on-time, late, cancelled, unknown-time, unannounced
platform and midnight departure cases have explicit handling. All times display
in Europe/London, including daylight saving time.

For each journey leg, platform-ready time is the previous selected departure plus
the selected service's ride time and the interchange walk. Location-based
walking time uses straight-line distance × 1.3 divided by the chosen pace. The
first service at or after ready time plus the safety buffer is recommended.
Platform wait is departure minus ready time; the boarding buffer is part of that
wait. Each downstream leg depends on a catchable upstream live prediction or
explicitly labelled published bus departure. The final
arrival adds the last ride and final walk. Alternative services added in the
builder must reach the selected alighting stop and can have different ride times.

Provider predictions older than 120 seconds and boards not fetched within 90
seconds cannot be recommended. A fetch error invalidates the previous board.
Current location expires after 120 seconds and needs accuracy ≤100 metres.
For the first walk, the planner prefers a nearby current location, then the
saved Home or Work point, then the leg's saved walk time. Location-based
walking estimates apply within 2.5 km of the stop. Direction is suggested when
one starting point is within 1.5 km and at least 300 metres nearer than the
other. A first boarding stop represents either direction with no saved point.
Manual direction selection wins.

The Journey screen lists the first two upcoming departures and the full route.
Marking a leg as boarded uses the current time and that leg's stored ride
estimate to plan the next transfer. The card then shows the first two
departures the planner considers catchable. Live keeps the full board.
Boarding progress belongs to the open page and can be undone or restarted.

Users can capture Home and Work from their device location or use the
[Postcodes.io lookup](https://postcodes.io/docs/postcode/lookup/) for an
approximate postcode point. Saving the journey stores the selected coordinates.
There is no background tracking.

Live boards show matching services returned for the saved route and destination.
The bus timetable section separately shows full published day patterns.

Stop lookup resolves TfL parent hubs to transport-specific stops and preserves
road-side stop letters. The builder lists active buses at that boarding stop by
route number and terminus. It checks that each selected service reaches the same
alighting stop and saves the matching branches.

TfL timetable intervals provide stop-to-stop ride durations where available.
For services with route sequences and no published intervals, the builder
labels estimates based on consecutive stop spacing and approximate speeds.
National Rail uses the scheduled departure and calling-point times in Darwin.
Time options can override any ride estimate. Older journeys keep their saved
ride times and route filters until edited.

## Bus timetables and fallback

TfL's `/Line/{line}/Timetable/{boardingStop}` supplies published schedules,
known journeys, route interval destinations and frequency periods. Requests are
for saved bus routes/stops, not a bulk copy of every London timetable. The server
caches timetable responses for 15 minutes; each response must match the requested
line and exact road-side boarding stop. All published patterns remain browsable.
The full-day view groups departures by destination and shows each published time
in full. Frequency windows are shown separately and never generate departures.

Automatic fallback resolves an unambiguous ordinary weekday/range for today and
tomorrow, with up to 24 hours of future exact departures. England/Wales bank
holidays come from `https://www.gov.uk/bank-holidays.json`, cached for six hours.
Unavailable calendar data, an unpublished year, bank holidays, school-day labels
and ambiguous patterns disable automatic fallback for the affected day. These
patterns may still be inspected manually; selecting a displayed pattern does not
override the planner's calendar checks. London DST skipped/repeated clock times
are excluded from automatic recommendations because no offset is supplied.

Live vehicles take precedence over scheduled departures through the route's live
prediction horizon plus two minutes. Cancellation times suppress corresponding
scheduled fallback. Scheduled rows have a separate `timetabled` flag, retain their
source timestamp and expire for recommendation after 15 minutes. They are labelled
**Scheduled · not live** in boards and the hero. A scheduled first leg feeds the
same ride and interchange calculation into later live train choices. Arrival and
platform-wait estimates state when the journey includes a scheduled bus.
