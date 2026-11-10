// @ts-nocheck -- compiler emits untyped data loops; controller and engine are typechecked.
// Generated from screens/Dashboard.aui; edit AUI source.
import { Alert, Badge, Button, Card, FileInput, Grid, Heading, Icon, Image, Input, Link, Page, Row, Section, Select, Services, Spacer, Stack, Text } from "@/components/ui"

export function Dashboard({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Row variant="topbar">
        <Row gap="sm">
          <Image src="./commute.svg" alt="" width={38} height={38} />
          <Stack gap="none">
            <Text variant="brand">My Commute</Text>
            <Text variant="eyebrow">LONDON, CONNECTED</Text>
          </Stack>
        </Row>
        <Row gap="sm">
          <Badge tone="neutral">London {data.time}</Badge>
          <Link href="/" variant="apps">Apps</Link>
        </Row>
      </Row>
      <Row variant="workspace">
        <Section variant="sidebar">
          <Text variant="eyebrow">YOUR EVERYDAY, SIMPLIFIED</Text>
          <Button variant={data.todayVariant} intent="today" icon="route">Your journey</Button>
          <Button variant={data.boardVariant} intent="board" icon="clock">Live departures</Button>
          <Button variant={data.statusVariant} intent="status" icon="activity">Network status</Button>
          <Button variant={data.savedVariant} intent="saved" icon="bookmark">Saved journeys</Button>
          <Spacer />
          <Card variant="sidebar-note">
            <Icon name="map-pin" />
            <Heading level={3}>Made for London.</Heading>
            <Text>Bus, Tube and rail. One connected journey.</Text>
          </Card>
          <Button variant={data.settingsVariant} intent="settings" icon="settings">Preferences</Button>
        </Section>
        <Stack variant="main">
          {data.error && (
            <Alert tone="warning" role="alert">{data.error}</Alert>
          )}
          {data.loading && (
            <Alert tone="info">Connecting to your Workspace account…</Alert>
          )}
          {data.signedOut ? (
            <Card variant="welcome">
              <Heading level={1}>Your London. Your way.</Heading>
              <Text>Sign in with MyAccounts to save your journeys and connect your live buses, Tube and trains.</Text>
              {data.localLogin ? (
                <>
                  <Text variant="muted">{data.localLoginDescription}</Text>
                  <Input name="email" value={data.email} type="email" label="Email" autoComplete="username" />
                  <Input name="password" value={data.password} type="password" label="Password" autoComplete="current-password" />
                  <Button intent="login" variant="primary">{data.localLoginLabel}</Button>
                </>
              ) : (
                <Link href={data.loginURL} variant="primary">Sign in with MyAccounts</Link>
              )}
            </Card>
          ) : (
            <>
              <Row variant="page-heading">
                <Stack gap="sm">
                  <Text variant="eyebrow">{data.date} · LONDON</Text>
                  <Heading level={1}>{data.title}</Heading>
                  <Text variant="muted">{data.subtitle}</Text>
                </Stack>
                <Button intent="refresh" variant="quiet" icon="refresh" disabled={data.busy}>{data.refreshLabel}</Button>
              </Row>
              {data.example && (
                <Alert tone="info">Example journey · Real TfL arrivals, with illustrative walking and ride times. Add your own commute to personalise it.</Alert>
              )}
              {data.showJourney && (
                <>
                  <Row variant="journey-controls">
                    <Select name="journey" value={data.journeyId} options={data.journeyOptions} label="Saved journey" />
                    <Row variant="segmented">
                      <Button intent="outbound" variant={data.outboundVariant} icon="briefcase">To work</Button>
                      <Button intent="inbound" variant={data.inboundVariant} icon="home">Going home</Button>
                    </Row>
                  </Row>
                  <Row variant="location-strip">
                    <Icon name="map-pin" />
                    <Text>{data.locationLabel}</Text>
                    {data.canUseLocation && (
                      <Button intent="locate" variant="text">{data.locationButton}</Button>
                    )}
                  </Row>
                  {data.directionSuggestion && (
                    <Alert tone="info">{data.directionSuggestion}</Alert>
                  )}
                  {data.emptyDirection ? (
                    <Card variant="welcome">
                      <Icon name="route" />
                      <Heading level={2}>Let’s connect your journey</Heading>
                      <Text>Add the stops and services you use, in travel order. Save each direction separately so you always get the right side of the road.</Text>
                      <Button intent="edit" variant="primary" icon="plus">Set up this direction</Button>
                    </Card>
                  ) : (
                    <Stack gap="lg">
                      <Card variant="trip-quick">
                        <Row variant="spread">
                          <Heading level={2}>{data.nextTitle}</Heading>
                          {data.showConnectionPlan && (
                            <Badge tone={data.feedTone}>{data.feedLabel}</Badge>
                          )}
                        </Row>
                        {data.tripProgress && (
                          <Text variant="connection">{data.tripProgress}</Text>
                        )}
                        {data.showConnectionPlan && (
                          <Stack gap="sm">
                            <Text variant="muted">{data.firstStop}</Text>
                            {data.nextArrivals.map((item, i) => (
                              <Row key={i} variant="arrival">
                                <Badge tone={item.tone}>{item.line}</Badge>
                                <Stack gap="xs">
                                  <Text variant="strong">{item.destination}</Text>
                                  <Text variant="muted">{item.detail}</Text>
                                </Stack>
                                <Stack variant="arrival-time">
                                  <Text variant="countdown">{item.minutes}</Text>
                                  <Text variant="muted">{item.clock}</Text>
                                </Stack>
                              </Row>
                            ))}
                            {data.noNextArrivals && (
                              <Text variant="empty">{data.firstBoardMessage}</Text>
                            )}
                            <Row variant="trip-actions" gap="sm">
                              <Button intent="boardLeg" variant="primary">{data.boardLegLabel}</Button>
                              <Button intent="board" variant="quiet">See all departures</Button>
                            </Row>
                          </Stack>
                        )}
                        {data.canUndoBoarding && (
                          <Row variant="trip-actions" gap="sm">
                            <Button intent="undoBoarding" variant="quiet">Undo boarding</Button>
                            <Button intent="restartTrip" variant="quiet">Restart journey</Button>
                          </Row>
                        )}
                        <Stack variant="trip-route" gap="sm">
                          {data.steps.map((item, i) => (
                            <Row key={i} variant="trip-summary" gap="sm">
                              <Icon name={item.icon} tone={item.tone} />
                              <Text variant="strong">{item.summary}</Text>
                              <Text variant="muted">{item.phase}</Text>
                            </Row>
                          ))}
                        </Stack>
                      </Card>
                      <Grid variant="journey-grid">
                        <Stack gap="lg">
                          {data.showConnectionPlan && (
                            <Card variant="hero">
                              <Row variant="spread">
                                <Badge tone="mint">{data.heroBadge}</Badge>
                                <Icon name="arrow-up-right" />
                              </Row>
                              <Text variant="hero-kicker">{data.heroKicker}</Text>
                              <Heading level={2}>{data.heroTitle}</Heading>
                              <Text variant="hero-copy">{data.heroCopy}</Text>
                              <Row variant="hero-stats">
                                <Stack gap="xs">
                                  <Text variant="stat-label">{data.readyLabel}</Text>
                                  <Text variant="stat-value">{data.leaveBy}</Text>
                                </Stack>
                                <Stack gap="xs">
                                  <Text variant="stat-label">EST. AT DESTINATION</Text>
                                  <Text variant="stat-value">{data.arriveBy}</Text>
                                </Stack>
                                <Stack gap="xs">
                                  <Text variant="stat-label">PLATFORM WAIT</Text>
                                  <Text variant="stat-value">{data.platformWait}</Text>
                                </Stack>
                              </Row>
                              <Text variant="hero-foot">{data.estimateNote}</Text>
                            </Card>
                          )}
                          <Card variant="timeline">
                            <Row variant="spread">
                              <Heading level={2}>Your journey, connected</Heading>
                              <Button intent="edit" variant="text" icon="pencil">Edit</Button>
                            </Row>
                            {data.steps.map((item, i) => (
                              <Row key={i} variant="step">
                                <Icon name={item.icon} tone={item.tone} />
                                <Stack gap="sm">
                                  <Text variant="eyebrow">{item.walkLabel}</Text>
                                  <Row variant="spread">
                                    <Heading level={3}>{item.title}</Heading>
                                    <Badge tone={item.tone}>{item.time}</Badge>
                                  </Row>
                                  <Text variant="muted">{item.detail}</Text>
                                  <Text variant="connection">{item.connection}</Text>
                                  {item.showStart && (
                                    <Button intent="startHere" payload={item.index} variant="text">Start from this stop</Button>
                                  )}
                                </Stack>
                              </Row>
                            ))}
                            <Row variant="destination">
                              <Icon name="flag" />
                              <Stack gap="xs">
                                <Text variant="strong">{data.destination}</Text>
                                <Text variant="muted">{data.finalWalkLabel}</Text>
                              </Stack>
                            </Row>
                          </Card>
                        </Stack>
                        <Stack gap="lg">
                          <Card variant="insight">
                            <Icon name="sparkles" />
                            <Heading level={3}>A little breathing room.</Heading>
                            <Text>{data.bufferNote}</Text>
                            <Button intent="settings" variant="text">Adjust your preferences</Button>
                          </Card>
                          <Card variant="data-note">
                            <Text variant="eyebrow">LIVE TIMES & PUBLISHED SCHEDULES</Text>
                            <Text>{data.updatedLabel}</Text>
                            <Text>Connections use your walking and ride estimates. Check the vehicle destination and station boards before boarding.</Text>
                          </Card>
                        </Stack>
                      </Grid>
                    </Stack>
                  )}
                </>
              )}
              {data.showBoard && (
                <>
                  <Row variant="journey-controls">
                    <Select name="journey" value={data.journeyId} options={data.journeyOptions} label="Saved journey" />
                    <Row variant="segmented">
                      <Button intent="outbound" variant={data.outboundVariant}>To work</Button>
                      <Button intent="inbound" variant={data.inboundVariant}>Going home</Button>
                    </Row>
                  </Row>
                  {data.hasBusLegs && (
                    <Row variant="segmented">
                      <Button intent="showArrivals" variant={data.arrivalsVariant}>Arrivals</Button>
                      <Button intent="showTimetables" variant={data.timetablesVariant}>Bus timetables</Button>
                    </Row>
                  )}
                  {data.showUpcoming && (
                    <Stack gap="lg">
                      {data.boards.map((item, i) => (
                        <Card key={i} variant="board">
                          <Row variant="spread">
                            <Stack gap="sm">
                              <Text variant="eyebrow">{item.label}</Text>
                              <Heading level={2}>{item.name}</Heading>
                            </Stack>
                            <Badge tone={item.tone}>{item.state}</Badge>
                          </Row>
                          <Text variant="muted">{item.filter}</Text>
                          {item.rows.map((item, i) => (
                            <Row key={i} variant="arrival">
                              <Badge tone={item.tone}>{item.line}</Badge>
                              <Stack gap="xs">
                                <Text variant="strong">{item.destination}</Text>
                                <Text variant="muted">{item.detail}</Text>
                              </Stack>
                              <Stack variant="arrival-time">
                                <Text variant="countdown">{item.minutes}</Text>
                                <Text variant="muted">{item.clock}</Text>
                              </Stack>
                            </Row>
                          ))}
                          <Text variant="muted">{item.message}</Text>
                        </Card>
                      ))}
                    </Stack>
                  )}
                  {data.emptyTimetables && (
                    <Card>
                      <Heading level={2}>Bus timetable unavailable</Heading>
                      <Text>Choose a journey with bus legs. If a timetable could not be loaded, refresh to retry. Live arrivals work independently.</Text>
                    </Card>
                  )}
                  {data.showTimetables && (
                    <>
                      <Card variant="timetable-filter">
                        <Heading level={2}>Full-day bus timetables</Heading>
                        <Text variant="muted">Published times in London local time. Use Arrivals for live updates. A time like 24:10 means 00:10 the following day.</Text>
                        <Select name="timetableDay" value={data.timetableDay} options={data.timetableOptions} label="Bus timetable day pattern" />
                      </Card>
                      {data.timetableCards.map((item, i) => (
                        <Card key={i} variant="timetable">
                          <Row variant="timetable-header" gap="sm">
                            <Badge tone="red">{item.line}</Badge>
                            <Heading level={3}>{item.stop}</Heading>
                          </Row>
                          {item.warning && (
                            <Text variant="muted">{item.warning}</Text>
                          )}
                          {item.empty && (
                            <Text>No confirmed pattern selected for this route. Choose a published day pattern above.</Text>
                          )}
                          {item.patterns.map((item, i) => (
                            <Stack key={i} gap="md">
                              <Badge tone="neutral">{item.name}</Badge>
                              {item.hasFrequency && (
                                <Stack variant="timetable-frequency" gap="sm">
                                  <Text variant="strong">Service frequency</Text>
                                  {item.frequencies.map((item, i) => (
                                    <Row key={i} variant="frequency-window" gap="sm">
                                      {item.window && (
                                        <Text variant="strong">{item.window}</Text>
                                      )}
                                      <Text>{item.detail}</Text>
                                    </Row>
                                  ))}
                                </Stack>
                              )}
                              {item.hasDepartures && (
                                <Stack gap="sm">
                                  <Text variant="eyebrow">SCHEDULED DEPARTURES</Text>
                                  {item.groups.map((item, i) => (
                                    <Stack key={i} variant="timetable-destination" gap="xs">
                                      <Heading level={4}>{item.heading}</Heading>
                                      {item.rows.map((item, i) => (
                                        <Row key={i} variant="timetable-hour" gap="sm">
                                          <Text variant="timetable-hour">{item.hour}</Text>
                                          <Row variant="timetable-times" gap="xs">
                                            {item.times.map((item, i) => (
                                              <Text key={i} variant="timetable-time">{item.text}</Text>
                                            ))}
                                          </Row>
                                        </Row>
                                      ))}
                                    </Stack>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          ))}
                        </Card>
                      ))}
                    </>
                  )}
                </>
              )}
              {data.showStatus && (
                <>
                  <Text variant="muted">Live TfL line status, including disruption details.</Text>
                  {data.statuses.map((item, i) => (
                    <Card key={i} variant="status-card">
                      <Row variant="spread">
                        <Row gap="md">
                          <Icon name="train" tone={item.tone} />
                          <Heading level={3}>{item.name}</Heading>
                        </Row>
                        <Badge tone={item.tone}>{item.status}</Badge>
                      </Row>
                      <Text variant="muted">{item.reason}</Text>
                    </Card>
                  ))}
                  {data.noStatus && (
                    <Card><Text>{data.statusMessage}</Text></Card>
                  )}
                </>
              )}
              {data.showSaved && (
                <>
                  <Button intent="new" variant="primary" icon="plus">Add a journey</Button>
                  <FileInput label="Import prepared journey" />
                  {data.noSaved && (
                    <Card variant="welcome">
                      <Icon name="bookmark" />
                      <Heading level={2}>Make the everyday easier</Heading>
                      <Text>Save your commute once. Get the buses and trains you can catch, every day.</Text>
                    </Card>
                  )}
                  {data.savedJourneys.map((item, i) => (
                    <Card key={i}>
                      <Row variant="spread">
                        <Stack gap="sm">
                          <Heading level={2}>{item.name}</Heading>
                          <Text variant="muted">{item.description}</Text>
                        </Stack>
                        <Button intent="openJourney" payload={item.id} variant="primary">Open</Button>
                      </Row>
                      <Row gap="sm">
                        <Button intent="editJourney" payload={item.id} variant="text" icon="pencil">Edit journey</Button>
                        <Button intent="deleteJourney" payload={item.id} variant="danger" icon="trash">Delete</Button>
                      </Row>
                    </Card>
                  ))}
                </>
              )}
              {data.showSettings && (
                <>
                  <Card variant="settings">
                    <Heading level={2}>Travel at your pace</Heading>
                    <Text variant="muted">Used to choose connections you can realistically make. All durations are in minutes.</Text>
                    <Input name="buffer" type="number" min={1} max={15} value={data.buffer} label="Boarding safety buffer" />
                    <Select name="walkSpeed" value={data.walkSpeed} label="Walking pace" options={data.walkOptions} />
                    <Input name="finalWalk" type="number" min={0} max={60} value={data.finalWalk} label="Walk from your last stop to your destination" />
                    <Button intent="savePreferences" variant="primary">Save preferences</Button>
                  </Card>
                  <Card>
                    <Heading level={2}>Your data & location</Heading>
                    <Text>Journeys and the Home or Work points you choose are saved privately to your Workspace account. Use my location checks where you are now and expires after two minutes.</Text>
                    <Text>{data.railAvailability}</Text>
                    <Link href="https://tfl.gov.uk" target="_blank">Powered by Transport for London open data</Link>
                    <Link href="https://www.nationalrail.co.uk/developers/darwin-data-feeds/" target="_blank">National Rail Darwin information</Link>
                    <Button intent="logout" variant="text">Sign out</Button>
                  </Card>
                  {data.isOwner && (
                    <Card variant="settings">
                      <Heading level={2}>Connect transport data</Heading>
                      <Text variant="muted">TfL works without a key within its public limits. Add your credentials to enable National Rail or your TfL subscription. Existing keys stay unchanged when left blank.</Text>
                      <Input name="providerKey" value={data.providerKey} type="password" label="TfL API key (optional)" autoComplete="off" />
                      <Input name="providerRail" value={data.providerRail} type="password" label="National Rail Darwin token" autoComplete="off" />
                      <Button intent="saveProviders" variant="primary">Save data connections</Button>
                    </Card>
                  )}
                </>
              )}
              {data.showEditor && (
                <Card variant="editor">
                  {data.showLegList && (
                    <Stack gap="lg">
                      <Row variant="spread">
                        <Heading level={2}>{data.editorTitle}</Heading>
                        <Button intent="cancelEdit" variant="quiet">Cancel</Button>
                      </Row>
                      <Input name="journeyName" value={data.editName} label="Journey name" placeholder="My work commute" maxLength={80} />
                      <Row variant="segmented">
                        <Button intent="editOutbound" variant={data.editOutboundVariant} icon="briefcase">To work</Button>
                        <Button intent="editInbound" variant={data.editInboundVariant} icon="home">Going home</Button>
                      </Row>
                      <Stack variant="origin-card" gap="sm">
                        <Row variant="leg-actions" gap="sm">
                          <Text variant="strong">Starting point · {data.editOriginName}</Text>
                          <Button intent="toggleOrigin" variant="quiet">{data.originAction}</Button>
                        </Row>
                        <Text variant="muted">{data.originDescription}</Text>
                        {data.originOpen && (
                          <Stack gap="sm">
                            <Input name="originPostcode" value={data.originPostcode} label={data.originPostcodeLabel} placeholder="Enter a UK postcode" maxLength={9} autoComplete="off" disabled={data.originBusy} />
                            <Row variant="leg-actions" gap="sm">
                              <Button intent="originLookup" variant="quiet" disabled={data.postcodeDisabled}>Use postcode</Button>
                              <Button intent="originLocate" variant="quiet" disabled={data.originBusy}>Use current location</Button>
                              {data.hasEditOrigin && (
                                <Button intent="removeOrigin" variant="danger">Remove starting point</Button>
                              )}
                            </Row>
                            <Text variant="muted">Postcode lookup sends just the postcode to Postcodes.io. It gives an approximate point for the area. Use your device location to pin a specific spot.</Text>
                            {data.originBusy && (
                              <Text role="status" variant="muted">Finding starting point…</Text>
                            )}
                          </Stack>
                        )}
                      </Stack>
                      <Text variant="muted">Add one leg at a time. Use Move up or Move down to change the travel order.</Text>
                      {data.editLegs.map((item, i) => (
                        <Stack key={i} variant="leg-card" gap="sm">
                          <Row gap="sm">
                            <Icon name={item.icon} />
                            <Stack gap="xs">
                              <Text variant="strong">{item.title}</Text>
                              <Text variant="muted">{item.detail}</Text>
                            </Stack>
                          </Row>
                          <Row variant="leg-actions" gap="sm">
                            <Button intent="moveLegUp" payload={item.id} variant="quiet" disabled={item.first}>Move up</Button>
                            <Button intent="moveLegDown" payload={item.id} variant="quiet" disabled={item.last}>Move down</Button>
                            <Button intent="editLeg" payload={item.id} variant="quiet">Edit</Button>
                            <Button intent="removeLeg" payload={item.id} variant="danger">Remove</Button>
                          </Row>
                        </Stack>
                      ))}
                      <Button intent="startLeg" variant="wide" icon="plus">Add a leg</Button>
                      <Row variant="editor-footer">
                        <Text variant="muted">{data.editorSummary}</Text>
                        <Button intent="saveJourney" variant="primary" disabled={data.saving}>Save journey</Button>
                      </Row>
                    </Stack>
                  )}
                  {data.buildingLeg && (
                    <Stack gap="lg">
                      <Row variant="spread">
                        <Heading level={2}>{data.builder.title}</Heading>
                        <Button intent="cancelLeg" variant="quiet">Cancel leg</Button>
                      </Row>
                      {data.builder.showMode && (
                        <Grid variant="form-grid">
                          <Button intent="chooseBus" variant="transport-choice" icon="bus">Bus</Button>
                          <Button intent="chooseTrain" variant="transport-choice" icon="train">Train</Button>
                        </Grid>
                      )}
                      {data.builder.showTrain && (
                        <Stack gap="sm">
                          {data.builder.trainModes.map((item, i) => (
                            <Button key={i} intent="chooseTrainMode" payload={item.id} variant="search-result" icon="train">{item.label}</Button>
                          ))}
                        </Stack>
                      )}
                      {data.builder.showSearch && (
                        <Stack gap="sm">
                          <Input name="builderSearch" value={data.builder.query} label={data.builder.searchLabel} placeholder="Type a stop or station name" maxLength={100} autoComplete="off" />
                          {data.builder.searchResults.map((item, i) => (
                            <Button key={i} intent="builderStop" payload={item.id} variant="search-result" disabled={data.builder.busy}>{item.label}</Button>
                          ))}
                        </Stack>
                      )}
                      {data.builder.showServices && (
                        <Stack gap="sm">
                          <Text variant="strong">{data.builder.stopName}</Text>
                          {data.builder.hasServices && (
                            <Stack gap="sm">
                              <Input name="builderSearch" value={data.builder.query} label={data.builder.serviceLabel} placeholder="Type to filter" autoComplete="off" />
                              <Services name="builderServices" value={data.builder.selectedServices} label="Services I can take" options={data.builder.serviceOptions} disabled={data.builder.busy} />
                            </Stack>
                          )}
                          <Button intent="builderContinue" variant="primary" disabled={data.builder.cannotContinue}>Choose where to get off</Button>
                        </Stack>
                      )}
                      {data.builder.showAlight && (
                        <Stack gap="sm">
                          {data.builder.noCommonStop && (
                            <Text>These services have no shared downstream stop. Go back and change the selection.</Text>
                          )}
                          {data.builder.rail ? (
                            <Text variant="muted">Select the station where you leave the train.</Text>
                          ) : (
                            <Stack gap="sm">
                              <Input name="builderSearch" value={data.builder.query} label="Search stops to get off at" placeholder="Type a stop name" autoComplete="off" />
                              {data.builder.alightOptions.map((item, i) => (
                                <Button key={i} intent="builderAlight" payload={item.id} variant="search-result">{item.label}</Button>
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      )}
                      {data.builder.showReview && (
                        <Stack gap="sm">
                          <Text variant="strong">{data.builder.summary}</Text>
                          {data.builder.destinations && (
                            <Text variant="muted">Towards {data.builder.destinations}</Text>
                          )}
                          {data.builder.rail && (
                            <Stack gap="sm">
                              <Input name="builderCrs" value={data.builder.crs} label="Boarding station code (CRS)" placeholder="e.g. WAT" maxLength={3} />
                              <Input name="builderToCrs" value={data.builder.toCrs} label="Alighting station code (CRS)" placeholder="e.g. CLJ" maxLength={3} />
                            </Stack>
                          )}
                          <Alert tone="info">{data.builder.estimate}</Alert>
                          <Button intent="builderChangeRoute" variant="quiet">Change stops and services</Button>
                          <Button intent="builderOptions" variant="quiet">{data.builder.optionsLabel}</Button>
                          {data.builder.optionsOpen && (
                            <Stack gap="sm">
                              <Input name="builderWalk" value={data.builder.walk} type="number" min={0} max={90} label="Walk to boarding (minutes)" />
                              <Button intent="builderOverride" variant="quiet">{data.builder.overrideLabel}</Button>
                              {data.builder.override && (
                                <Input name="builderRide" value={data.builder.ride} type="number" min={1} max={180} label="Ride duration override (minutes)" />
                              )}
                            </Stack>
                          )}
                          <Button intent="addLeg" variant="primary" disabled={data.builder.busy}>{data.builder.addLabel}</Button>
                        </Stack>
                      )}
                      {data.builder.busy && (
                        <Text role="status" variant="muted">Loading transport data…</Text>
                      )}
                      {data.builder.notice && (
                        <Alert tone="warning" role="status">{data.builder.notice}</Alert>
                      )}
                      {data.builder.showBack && (
                        <Button intent="builderBack" variant="quiet">Back</Button>
                      )}
                    </Stack>
                  )}
                </Card>
              )}
              <Row variant="footer">
                <Text>My Commute · London</Text>
                <Text>TfL predictions refresh every 30 seconds while open.</Text>
              </Row>
            </>
          )}
        </Stack>
      </Row>
      <Row variant="bottom-nav">
        <Button intent="today" variant={data.todayVariant} icon="route">Journey</Button>
        <Button intent="board" variant={data.boardVariant} icon="clock">Live</Button>
        <Button intent="status" variant={data.statusVariant} icon="activity">Status</Button>
        <Button intent="saved" variant={data.savedVariant} icon="bookmark">Saved</Button>
        <Button intent="settings" variant={data.settingsVariant} icon="settings">You</Button>
      </Row>
      {data.toast && (
        <Alert variant="toast" role="status">{data.toast}</Alert>
      )}
    </Page>
  )
}
