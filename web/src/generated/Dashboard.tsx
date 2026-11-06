// @ts-nocheck -- compiler emits untyped data loops; controller and engine are typechecked.
// Generated from screens/Dashboard.aui; edit AUI source.
import { Fragment } from 'react'
import { Alert, Badge, Button, Card, Divider, FileInput, Grid, Heading, Icon, Image, Input, Link, Page, Row, Section, Select, Services, Spacer, Stack, Text } from "@/components/ui"

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
                    <Button intent="locate" variant="text">{data.locationButton}</Button>
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
                    <Grid variant="journey-grid">
                      <Stack gap="lg">
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
                              <Text variant="stat-label">LEAVE BY</Text>
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
                                <Button intent="startHere" payload={item.index} variant="text">Start from this stop</Button>
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
                        <Card>
                          <Row variant="spread">
                            <Heading level={2}>Next at your stop</Heading>
                            <Badge tone={data.feedTone}>{data.feedLabel}</Badge>
                          </Row>
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
                          <Button intent="board" variant="wide" icon="arrow-right">See all departures</Button>
                        </Card>
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
                      <Card>
                        <Heading level={2}>Full-day bus timetables</Heading>
                        <Text variant="muted">All times are London local time. Scheduled departures are not live predictions. Times after 24:00 belong to the following day.</Text>
                        <Select name="timetableDay" value={data.timetableDay} options={data.timetableOptions} label="Bus timetable day pattern" />
                      </Card>
                      {data.timetableCards.map((item, i) => (
                        <Card key={i} variant="board">
                          <Heading level={3}>{item.title}</Heading>
                          <Text variant="muted">{item.direction}</Text>
                          <Text variant="muted">{item.message}</Text>
                          {item.empty && (
                            <Text>No confirmed pattern selected for this route. Choose a published day pattern above.</Text>
                          )}
                          {item.patterns.map((item, i) => (
                            <Fragment key={i}>
                              <Heading level={3}>{item.name}</Heading>
                              {item.frequencies.map((item, i) => (
                                <Text key={i} variant="muted">{item.text}</Text>
                              ))}
                              {item.rows.map((item, i) => (
                                <Row key={i} variant="timetable-hour">
                                  <Text variant="strong">{item.hour}</Text>
                                  <Stack gap="xs">
                                    <Text>{item.times}</Text>
                                    <Text variant="muted">{item.destination}</Text>
                                  </Stack>
                                </Row>
                              ))}
                            </Fragment>
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
                    <Text>Journeys are saved privately to your Workspace account. Location is requested only when you tap Use my location. It stays in this page and expires after two minutes.</Text>
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
                  <Row variant="spread">
                    <Heading level={2}>{data.editorTitle}</Heading>
                    <Button intent="cancelEdit" variant="quiet">Cancel</Button>
                  </Row>
                  <Input name="journeyName" value={data.editName} label="Journey name" placeholder="My work commute" maxLength={80} />
                  <Row variant="segmented">
                    <Button intent="editOutbound" variant={data.editOutboundVariant} icon="briefcase">To work</Button>
                    <Button intent="editInbound" variant={data.editInboundVariant} icon="home">Going home</Button>
                  </Row>
                  <Text variant="muted">Add legs in travel order. Each direction needs its own stops, platforms and destinations.</Text>
                  {data.editLegs.map((item, i) => (
                    <Row key={i} variant="edit-leg">
                      <Icon name={item.icon} />
                      <Stack gap="xs">
                        <Text variant="strong">{item.title}</Text>
                        <Text variant="muted">{item.detail}</Text>
                      </Stack>
                      <Button intent="editLeg" payload={item.id} variant="quiet" icon="pencil">Edit</Button>
                      <Button intent="removeLeg" payload={item.id} variant="danger" icon="trash">Remove</Button>
                    </Row>
                  ))}
                  <Divider />
                  <Heading level={3}>{data.legEditorTitle}</Heading>
                  <Select name="mode" value={data.editMode} label="Transport" options={data.modeOptions} />
                  <Input name="search" value={data.search} label="Find your boarding stop or station" placeholder="e.g. Highbury, Brixton, Waterloo" maxLength={100} />
                  <Button intent="searchStops" variant="wide" icon="search" disabled={data.searching}>{data.searchLabel}</Button>
                  {data.stopResults.map((item, i) => (
                    <Button key={i} intent="chooseStop" payload={item.id} variant="search-result">{item.label}</Button>
                  ))}
                  {data.selectedStop && (
                    <Alert tone="info">{data.selectedStop}</Alert>
                  )}
                  {data.editRail ? (
                    <>
                      <Input name="crs" value={data.editCrs} label="Departure station code (CRS)" placeholder="e.g. WAT" maxLength={3} />
                      <Input name="toCrs" value={data.editToCrs} label="Destination station code (CRS)" placeholder="e.g. CLJ" maxLength={3} />
                      <Text variant="muted">Choose the boarding station above to enable location suggestions. National Rail uses three-letter station codes. Live boards need a configured Darwin token.</Text>
                    </>
                  ) : (
                    <>
                      <Select name="line" value={data.editLine} label="Bus route or line" options={data.lineOptions} />
                      <Services name="routes" value={data.editRoutes} label="Services I can take" options={data.lineOptions} />
                      <Text variant="muted">Select alternatives only when they use your chosen platform and reach the same interchange. We choose the first catchable service.</Text>
                      <Select name="direction" value={data.editDirection} label="Direction / platform" options={data.directionOptions} />
                      <Input name="destination" value={data.editDestination} label="Destination shown on vehicle (optional filter)" placeholder="e.g. Brixton" maxLength={100} />
                    </>
                  )}
                  <Input name="to" value={data.editTo} label="Where you get off" placeholder="e.g. Oxford Circus" maxLength={100} />
                  <Grid variant="form-grid">
                    <Input name="walk" value={data.editWalk} type="number" min={0} max={90} label="Walk to this stop / platform" />
                    <Input name="ride" value={data.editRide} type="number" min={1} max={180} label="Estimated ride duration" />
                  </Grid>
                  <Text variant="muted">For a connection, include the walk from the previous stop to this platform. Ride durations are your estimates, not live traffic predictions.</Text>
                  <Button intent="addLeg" variant="wide" icon="plus">{data.addLegLabel}</Button>
                  <Row variant="editor-footer">
                    <Text variant="muted">{data.editorSummary}</Text>
                    <Button intent="saveJourney" variant="primary" disabled={data.saving}>Save journey</Button>
                  </Row>
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
