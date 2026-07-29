'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type FlowStep = 'read' | 'reflect' | 'remember' | 'realize'

const FLOW_STEPS: { kind: FlowStep; icon: string; label: string; summary: string }[] = [
  {
    kind: 'read',
    icon: '📖',
    label: 'Read',
    summary: 'Capture quotes and realizations, anytime',
  },
  {
    kind: 'reflect',
    icon: '✍️',
    label: 'Reflect',
    summary: 'Prompts adapt to how you read',
  },
  {
    kind: 'remember',
    icon: '💭',
    label: 'Remember',
    summary: 'Your reflections become memory cards',
  },
  {
    kind: 'realize',
    icon: '💡',
    label: 'Realize',
    summary: 'You start realizing how your books connect',
  },
]

function MicIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 1a3.5 3.5 0 0 0-3.5 3.5v7a3.5 3.5 0 1 0 7 0v-7A3.5 3.5 0 0 0 12 1Z" fill="#FAF9F6" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v4M8.5 22h7" stroke="#FAF9F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OptionPills({ options }: { options: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {options.map((opt) => (
        <div
          key={opt}
          style={{
            background: '#F3F1EC',
            border: '1px solid rgba(58,58,56,0.1)',
            borderRadius: 100,
            padding: '6px 10px',
            fontSize: 10,
            color: '#3A3A38',
            textAlign: 'left',
          }}
        >
          {opt}
        </div>
      ))}
    </div>
  )
}

function OpenTextMock() {
  return (
    <div style={{ position: 'relative', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.1)', borderRadius: 8, padding: '10px 34px 10px 10px', minHeight: 34, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10.5, color: '#ADABA2' }}>Take your time…</div>
      <div style={{ position: 'absolute', right: 5, top: 5, width: 20, height: 20, borderRadius: '50%', background: '#3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MicIcon />
      </div>
    </div>
  )
}

function ReflectQuestion({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11.5, lineHeight: 1.35, color: '#3A3A38', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function ReflectDivider() {
  return <div style={{ height: 1, background: 'rgba(58,58,56,0.08)', margin: '12px 0' }} />
}

export default function WelcomePage() {
  const router = useRouter()
  const [expandedStep, setExpandedStep] = useState<FlowStep | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 24px 50px', boxSizing: 'border-box' }}>

        {/* 1. Hero */}
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <img src="/images/logo-wordmark.png" alt="Afterwords" style={{ display: 'block', width: 200, maxWidth: '100%', objectFit: 'contain', margin: '0 auto 22px' }} />
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 500, color: '#3A3A38', lineHeight: 1.4, marginBottom: 12 }}>
              Books change you.<br />Afterwords helps you remember how.
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#5c5642', maxWidth: 340, margin: '0 auto 14px' }}>
              Capture the thoughts, questions, and moments that stay with you long after you close the book.
            </div>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.5, color: '#6B8F76', maxWidth: 320, margin: '0 auto' }}>
              Your highlights fade. Your thinking doesn&apos;t have to.
            </div>
          </div>
        </FadeInSection>

        {/* 2. The flow — accordion */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ height: 1, background: 'rgba(58,58,56,0.15)', margin: '0 auto 20px', width: 60 }} />
          <FadeInSection delay={100}>
            <div style={{ fontFamily: 'Spectral, serif', fontSize: 15, color: '#3A3A38', textAlign: 'center', marginBottom: 20 }}>
              Every book becomes part of a bigger conversation — with yourself.
            </div>
          </FadeInSection>
          {FLOW_STEPS.map((step, i) => {
            const isExpanded = expandedStep === step.kind
            return (
              <FadeInSection key={step.kind} delay={i * 80}>
              <div
                style={{
                  background: '#F3F1EC',
                  border: '1px solid rgba(58,58,56,0.08)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  textAlign: 'left',
                  marginBottom: isExpanded ? 16 : 8,
                }}
              >
                <div
                  onClick={() => setExpandedStep(isExpanded ? null : step.kind)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{step.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: '#3A3A38', lineHeight: 1.2 }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8880', marginTop: 2, lineHeight: 1.35 }}>
                        {step.summary}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#8A8880',
                      flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      lineHeight: 1,
                    }}
                  >
                    ▾
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16, transition: 'all 0.3s ease' }}>
                    {step.kind === 'read' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#3A3A38', textAlign: 'right', lineHeight: 1.3, maxWidth: 130 }}>
                            I Who Have Never Known Men
                          </div>
                          <img
                            src="/images/cover-i-who-have-never-known-men.jpg"
                            alt="I Who Have Never Known Men"
                            style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 5px rgba(0,0,0,0.12)', display: 'block', flexShrink: 0 }}
                          />
                        </div>

                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)', marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', marginBottom: 12 }}>📖 Favorite quote</div>
                          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: '#3A3A38', marginBottom: 12 }}>
                            &quot;I was forced to acknowledge too late, much too late, that I too had loved, that I was capable of suffering, and that I was human after all.&quot;
                          </div>
                          <div style={{ height: 1, background: 'rgba(58,58,56,0.1)', marginBottom: 10 }} />
                          <div style={{ fontSize: 11, color: '#8A8880' }}>saved 6 months ago</div>
                        </div>

                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', marginBottom: 12 }}>💭 A realization</div>
                          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: '#3A3A38', marginBottom: 12 }}>
                            The loneliness in this story stayed with me long after I finished reading. It made me appreciate how even the smallest human connections shape who we become.
                          </div>
                          <div style={{ height: 1, background: 'rgba(58,58,56,0.1)', marginBottom: 10 }} />
                          <div style={{ fontSize: 11, color: '#8A8880' }}>saved 6 months ago</div>
                        </div>
                      </div>
                    )}

                    {step.kind === 'reflect' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#3A3A38' }}>Four Thousand Weeks</div>
                            <div style={{ fontSize: 10, color: '#8A8880' }}>Time Management for Mortals</div>
                          </div>
                          <img
                            src="/images/cover-four-thousand-weeks.jpg"
                            alt="Four Thousand Weeks"
                            style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 5px rgba(0,0,0,0.12)', display: 'block', background: '#d9d0bc' }}
                          />
                        </div>

                        <style>{`
                          .aw-reflect-grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 12px;
                            align-items: start;
                          }
                          @media (max-width: 640px) {
                            .aw-reflect-grid {
                              grid-template-columns: 1fr;
                            }
                          }
                        `}</style>

                        <div className="aw-reflect-grid">
                          <div style={{ background: '#FAF9F6', borderRadius: 10, padding: 14, border: '1px solid rgba(58,58,56,0.06)' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8880' }}>Casual reader</div>
                            <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#8A8880', marginBottom: 10 }}>multiple choice</div>
                            <ReflectQuestion>Burkeman says &apos;patience&apos; is hard for us because we expect things to happen how?</ReflectQuestion>
                            <OptionPills options={['Instantly', 'Randomly', 'Slowly', 'Cheaply']} />
                            <ReflectDivider />
                            <ReflectQuestion>In chapter 12, Burkeman says resisting the urge to hurry helps you do what?</ReflectQuestion>
                            <OptionPills options={['Stay present', 'Save money', 'Plan better', 'Work faster']} />
                          </div>

                          <div style={{ background: '#FAF9F6', borderRadius: 10, padding: 14, border: '1px solid rgba(58,58,56,0.06)' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8880' }}>Engaged reader</div>
                            <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#8A8880', marginBottom: 10 }}>recall + reflection</div>
                            <ReflectQuestion>Burkeman says the present moment is the only place where what happens?</ReflectQuestion>
                            <OptionPills options={['Life actually occurs', 'Plans get made', 'Stress goes away', 'Time speeds up']} />
                            <ReflectDivider />
                            <ReflectQuestion>Now that the book is done, what do you most want to actually change about how you spend your time?</ReflectQuestion>
                            <OpenTextMock />
                          </div>

                          <div style={{ background: '#FAF9F6', borderRadius: 10, padding: 14, border: '1px solid rgba(58,58,56,0.06)' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8880' }}>Deep reader</div>
                            <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#8A8880', marginBottom: 10 }}>personal reflection</div>
                            <ReflectQuestion>Burkeman says we should stop trying to &apos;do it all.&apos; What does that free you up to actually care about?</ReflectQuestion>
                            <OpenTextMock />
                            <ReflectDivider />
                            <ReflectQuestion>Which relationship in your life came to mind when Burkeman talked about showing up fully for others?</ReflectQuestion>
                            <OpenTextMock />
                          </div>
                        </div>
                      </div>
                    )}

                    {step.kind === 'remember' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#3A3A38', textAlign: 'right', lineHeight: 1.3, maxWidth: 130 }}>
                            The Let Them Theory
                          </div>
                          <img
                            src="/images/cover-let-them-theory.jpg"
                            alt="The Let Them Theory"
                            style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 5px rgba(0,0,0,0.12)', display: 'block', flexShrink: 0, background: '#d9d0bc' }}
                          />
                        </div>

                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)', marginBottom: 12 }}>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>
                            The Cost of Managing Everyone Else
                          </div>
                          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.45, color: '#3A3A38', marginBottom: 10 }}>
                            &quot;I kept a list in my head of who was disappointed in me and why. Reading this, I realized the list was longer than any actual list of things I&apos;d done wrong.&quot;
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 4 }}>
                            Insight
                          </div>
                          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#4a4636' }}>
                            You weren&apos;t managing other people, you were managing your idea of their judgment. The insight you kept isn&apos;t about control at all — it&apos;s about how much energy was going toward a version of people that only exists in your head.
                          </div>
                        </div>

                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6B8F76', marginBottom: 3 }}>CH 6</div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>
                            Other people&apos;s opinions aren&apos;t yours to manage
                          </div>
                          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#4a4636', marginBottom: 12 }}>
                            <span style={{ color: '#6B8F76', fontWeight: 600 }}>Your takeaway:</span> You keep spending energy trying to control how people see you. Letting that go isn&apos;t giving up — it&apos;s redirecting that energy to what&apos;s actually yours to change.
                          </div>
                          <div style={{ background: '#F3F1EC', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>💭 Your reflection</div>
                            <div style={{ fontSize: 11.5, color: '#3A3A38', lineHeight: 1.45 }}>
                              Stop rehearsing what other people might think before I even say anything
                            </div>
                          </div>
                          <div style={{ background: '#F3F1EC', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8A8880', marginBottom: 4 }}>✅ Quiz</div>
                            <div style={{ fontSize: 11.5, color: '#3A3A38', lineHeight: 1.45 }}>
                              Their reaction is theirs to have — <span style={{ color: '#6B8F76', fontWeight: 600 }}>Answered ✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {step.kind === 'realize' && (
                      <div>
                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 18, border: '1px solid rgba(58,58,56,0.06)', marginBottom: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#3A3A38', marginBottom: 14 }}>
                            I Who Have Never Known Men
                          </div>
                          <svg viewBox="0 0 320 260" style={{ width: '100%', maxWidth: 320, height: 'auto', display: 'block', margin: '0 auto' }}>
                            <line x1={230} y1={110} x2={270} y2={180} stroke="#E4E1D8" strokeWidth={1} />
                            <line x1={90} y1={110} x2={50} y2={180} stroke="#E4E1D8" strokeWidth={1} />
                            <line x1={90} y1={110} x2={160} y2={220} stroke="#E4E1D8" strokeWidth={1} />
                            <line x1={230} y1={110} x2={160} y2={220} stroke="#E4E1D8" strokeWidth={1} />
                            <line x1={160} y1={220} x2={270} y2={240} stroke="#E4E1D8" strokeWidth={1} />
                            <line x1={160} y1={50} x2={230} y2={110} stroke="#B08560" strokeWidth={1.5} />
                            <line x1={160} y1={50} x2={90} y2={110} stroke="#8FA8C7" strokeWidth={1.5} />
                            <circle cx={160} cy={50} r={20} fill="#6B8F76" stroke="#FAF9F6" strokeWidth={3} />
                            <circle cx={230} cy={110} r={13} fill="#8B5A3C" stroke="#FAF9F6" strokeWidth={2} />
                            <circle cx={90} cy={110} r={13} fill="#C9A97A" stroke="#FAF9F6" strokeWidth={2} />
                            <circle cx={270} cy={180} r={12} fill="#B08BA8" stroke="#FAF9F6" strokeWidth={1.5} />
                            <circle cx={50} cy={180} r={12} fill="#7B93B8" stroke="#FAF9F6" strokeWidth={1.5} />
                            <circle cx={160} cy={220} r={11} fill="#8FA888" stroke="#FAF9F6" strokeWidth={1.5} />
                            <circle cx={270} cy={240} r={10} fill="#C7C4B8" stroke="#FAF9F6" strokeWidth={1.5} />
                          </svg>
                          <div style={{ fontSize: 10.5, color: '#8A8880', marginTop: 10 }}>11 connections discovered</div>
                        </div>

                        <div style={{ background: '#F0E6D2', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)', marginBottom: 12 }}>
                          <div style={{ fontSize: 11, lineHeight: 1.45, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: '#8B6D3F' }}>I Who Have Never Known Men ↔ Four Thousand Weeks: Time Management for Mortals</span>
                            <span style={{ color: '#A69875' }}> · The weight of time running out</span>
                          </div>
                          <div style={{ fontSize: 11.5, lineHeight: 1.55, color: '#4a4636' }}>
                            The image of the narrator dying alone, with no one to remember her, touches the same nerve as Burkeman&apos;s pressure of finite time — both left you sitting with the urgency and loneliness of a life that simply ends.
                          </div>
                        </div>

                        <div style={{ background: '#FAF9F6', borderRadius: 14, padding: 16, border: '1px solid rgba(58,58,56,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#7B93B8' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7B93B8', display: 'inline-block' }} />
                              Meaning &amp; Purpose
                            </div>
                            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B8F76' }}>
                              Related
                            </div>
                          </div>

                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: '#3A3A38', marginBottom: 10, lineHeight: 1.35 }}>
                            Meaning doesn&apos;t require a perfect foundation to be real
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                            <img src="/images/cover-four-thousand-weeks.jpg" alt="" style={{ width: 18, height: 24, objectFit: 'cover', borderRadius: 3, display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#3A3A38' }}>Four Thousand Weeks: Time Management for Mortals</span>
                            <span style={{ fontSize: 11, color: '#8A8880' }}>×</span>
                            <img src="/images/cover-i-who-have-never-known-men.jpg" alt="" style={{ width: 18, height: 24, objectFit: 'cover', borderRadius: 3, display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#3A3A38' }}>I Who Have Never Known Men</span>
                          </div>

                          <div style={{ fontSize: 11, lineHeight: 1.55, color: '#4a4636', marginBottom: 10 }}>
                            You noticed that the narrator found meaning without memory, history, or belonging — and Burkeman makes a similar case that meaning doesn&apos;t require doing it all or having unlimited time. Both books pushed you toward the idea that a life can matter on its own terms, within its own limits.
                          </div>

                          <div style={{ height: 1, background: 'rgba(58,58,56,0.1)', marginBottom: 10 }} />

                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 4 }}>
                            Evidence
                          </div>
                          <div style={{ fontSize: 10.5, color: '#4a4636', lineHeight: 1.6, marginBottom: 2 }}>
                            · a meaningful life doesn&apos;t depend on having a past
                          </div>
                          <div style={{ fontSize: 10.5, color: '#4a4636', lineHeight: 1.6, marginBottom: 12 }}>
                            · focus on the things that would actually make my life more meaningful
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B8F76' }}>
                            View memories →
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </FadeInSection>
            )
          })}
        </div>

        {/* 3. Value section */}
        <FadeInSection>
        <div style={{ textAlign: 'center', marginBottom: 48, padding: '8px 0' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', lineHeight: 1.35, marginBottom: 16 }}>
            Reading is easy. Remembering is hard.
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5c5642', maxWidth: 400, margin: '0 auto' }}>
            Most books leave us inspired. A week later, we barely remember why. Afterwords helps you keep the ideas that actually changed your thinking — not just the passages you highlighted.
          </div>
          <div style={{ height: 1, background: 'rgba(58,58,56,0.15)', margin: '28px auto 32px', width: 60 }} />
          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#3A3A38', marginBottom: 16 }}>
            Built for thoughtful readers, not productivity hacks.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#8A8880', marginTop: 0 }}>
            No streaks. No reading quotas. No endless notifications.
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#3A3A38', marginTop: 10 }}>
            Just a quiet place to think about what you read.
          </div>
        </div>
        </FadeInSection>

        {/* 4. AI positioning section */}
        <FadeInSection>
        <div style={{ marginBottom: 48 }}>
          <style>{`
            .aw-ai-layout {
              display: flex;
              gap: 20px;
              align-items: center;
            }
            @media (max-width: 640px) {
              .aw-ai-layout {
                flex-direction: column;
              }
            }
          `}</style>
          <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 16, padding: 22 }}>
            <div className="aw-ai-layout">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: '#FAF9F6', borderRadius: 12, padding: 14, border: '1px solid rgba(58,58,56,0.06)', marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B8F76' }}>Finished</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12, fontWeight: 600, color: '#3A3A38', margin: '4px 0', lineHeight: 1.3 }}>
                    Four Thousand Weeks: Time Management for Mortals
                  </div>
                  <div style={{ fontSize: 9.5, color: '#8A8880', marginBottom: 8 }}>You answered 34 prompts · Saved 4 quotes</div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 3, textAlign: 'left' }}>AI Summary</div>
                  <div style={{ fontSize: 10, lineHeight: 1.45, color: '#4a4636', textAlign: 'left' }}>
                    Throughout this book, you kept returning to a tension that feels very personal to you — the pressure to act now because time is running out, sitting alongside a growing desire to slow down…
                  </div>
                </div>

                <div style={{ background: '#FAF9F6', borderRadius: 12, padding: 14, border: '1px solid rgba(58,58,56,0.06)', textAlign: 'left' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 6 }}>What Your Reading Says</div>
                  <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 10.5, lineHeight: 1.45, color: '#3A3A38', marginBottom: 6 }}>
                    Across every book you&apos;ve engaged with, you keep returning to the same quiet tension: the pull between accepting what is…
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6B8F76' }}>Read more →</div>
                </div>
              </div>

              <div style={{ flex: 1.2, textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 12 }}>
                  Your personal reading companion
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5c5642', marginBottom: 16 }}>
                  As you keep reading, Afterwords begins noticing things even you might miss:
                </div>
                <div>
                  {['recurring questions', 'changing beliefs', 'books that echo each other', 'themes that follow you for years'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ color: '#6B8F76', fontSize: 13, marginTop: 1 }}>•</div>
                      <div style={{ fontSize: 14, color: '#8A8880', lineHeight: 1.4 }}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(58,58,56,0.1)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: '#3A3A38', lineHeight: 1.4 }}>
                It doesn&apos;t summarize books.<br />It summarizes your thinking.
              </div>
            </div>
          </div>
        </div>
        </FadeInSection>

        {/* 6. CTA + footer */}
        <FadeInSection>
        <button
          onClick={() => router.push('/login')}
          style={{ display: 'block', width: 'auto', maxWidth: '100%', margin: '0 auto 16px', background: '#6B8F76', color: '#FAF9F6', fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
        >
          Start remembering what you read
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8880', marginBottom: 24 }}>
          Already have an account? <span onClick={() => router.push('/login')} style={{ fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Log in</span>
        </div>

        <div style={{ height: 1, background: 'rgba(58,58,56,0.15)', margin: '8px 0 24px', width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#8A8880' }}>
          <a href="/pricing" style={{ color: '#8A8880', textDecoration: 'none' }}>Pricing</a>
          <a href="/terms" style={{ color: '#8A8880', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: '#8A8880', textDecoration: 'none' }}>Privacy</a>
          <a href="/refunds" style={{ color: '#8A8880', textDecoration: 'none' }}>Refunds</a>
          <a href="/contact" style={{ color: '#8A8880', textDecoration: 'none' }}>Contact</a>
        </div>
        </FadeInSection>

      </div>
    </div>
  )
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
