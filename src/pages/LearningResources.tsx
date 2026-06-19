import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Trophy, Award, GraduationCap, Play, CheckCircle2, AlertTriangle, 
  Lightbulb, Calculator, HelpCircle, Edit3, Calendar, Flame, MessageSquare, 
  Heart, DollarSign, Target, Settings, Info, RefreshCw, Copy, Check, Star, 
  Sparkles, ChevronRight, ChevronLeft, User, Users, Shield, Zap, Clock, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Storage } from '../lib/storage';
import { useLocation } from 'react-router-dom';

// Types & interfaces
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface ExamScore {
  category: string; // 'foundations' | 'growth' | 'mastery'
  score: number;
  total: number;
  passed: boolean;
  timestamp: string;
}

// Block 1 Quiz questions
const BLOCK1_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "What is the primary psychological purpose of the 'Digital Handshake' in the first 3 seconds of a user clicking your thumbnail?",
    options: [
      "To show off your artistic skills.",
      "To establish cognitive fluency, reducing trust barriers and cognitive load for the visitor.",
      "To force the user to click follow immediately.",
      "To satisfy platform algorithms."
    ],
    correctAnswer: 1,
    explanation: "The brain craves simplicity. Instantly understanding the host's identity and value proposition in 3 seconds lowers cognitive friction, making them stay."
  },
  {
    question: "How does a polished, professional profile photo help the host internally?",
    options: [
      "It allows them to request higher salary tiers from the agency.",
      "It reduces impostor syndrome by acting as professional 'armor' and establishing a persona boundary.",
      "It attracts sponsors automatically.",
      "It prevents technical glitches on the platform."
    ],
    correctAnswer: 1,
    explanation: "A high-quality profile helps the host separate their raw, vulnerable self from their professional streamer persona, boosting confidence and reducing personal anxiety."
  },
  {
    question: "Why is high-quality vocal audio considered more critical for viewer retention than HD camera resolution?",
    options: [
      "Audio signals take less bandwidth on mobile devices.",
      "Bad audio creates heavy cognitive load and auditory fatigue, prompting immediate exit.",
      "Viewers never listen to streams; they only watch them.",
      "High-resolution cameras are too expensive for beginner hosts."
    ],
    correctAnswer: 1,
    explanation: "Audiences will tolerate average visual quality, but distorted, noisy, or echoey audio triggers subconscious irritation and cognitive fatigue, causing them to leave."
  },
  {
    question: "What evolutionary psychology trigger is simulated by front-facing lighting that highlights the host's eyes?",
    options: [
      "A sense of danger and adrenaline.",
      "Direct eye contact, which triggers trust and parasocial warmth.",
      "Financial superiority.",
      "Hypnotic suggestion."
    ],
    correctAnswer: 1,
    explanation: "In human evolution, seeing a person's eyes clearly indicates safety and focus, simulating eye contact which triggers oxytocin and builds trust in a parasocial environment."
  },
  {
    question: "From an audience perspective, what daily ritual is formed by a highly consistent stream schedule?",
    options: [
      "The bandwagon effect.",
      "Pavlovian habit formation, anchoring the stream into the viewer's daily schedule.",
      "Fear of missing out (FOMO).",
      "Cognitive dissonance."
    ],
    correctAnswer: 1,
    explanation: "When you stream at the exact same time daily, viewers build a habit, automatically reserving that time slot for your stream in their daily routine."
  },
  {
    question: "If you must cancel or delay a stream, why is it psychologically necessary to notify your Fanclub GC at least 2 hours prior?",
    options: [
      "To get approval from your manager.",
      "To mitigate abandonment anxiety and respect the supporters' emotional and time investment.",
      "To bypass platform penalties.",
      "To increase your viewership for the next session."
    ],
    correctAnswer: 1,
    explanation: "Unannounced absences damage trust and make supporters feel their commitment is undervalued. A 2-hour notice respects their time and turns an absence into a trust-building exercise."
  },
  {
    question: "Why is establishing a 'Tribe Name' (e.g., Niner Tribe) in your bio an effective audience tool?",
    options: [
      "It makes it easier to rank in search results.",
      "It satisfies the fundamental human drive for social belonging and community membership.",
      "It allows you to trademark your community.",
      "It increases the speed of payment processing."
    ],
    correctAnswer: 1,
    explanation: "Viewers seek connection. Having a specific tribe name makes them feel like they are joining a community with its own identity, satisfying their need for belonging."
  },
  {
    question: "What internal psychological state is triggered in a host by erratic streaming hours?",
    options: [
      "A sense of freedom and creativity.",
      "High performance anxiety and decision fatigue regarding when to broadcast.",
      "Increased confidence.",
      "Algorithmic preference."
    ],
    correctAnswer: 1,
    explanation: "Erratic hours force the host to constantly decide when to go live, leading to procrastination, decision fatigue, and increased anxiety before going live."
  },
  {
    question: "Why does a clean, clutter-free background (avoiding visible unmade beds or laundry) affect the audience's perception of your stream's value?",
    options: [
      "It makes them think you live in a mansion.",
      "It signals professionalism and respects their time, associating the stream with higher quality and value.",
      "It makes the stream load faster.",
      "It satisfies the safety policy of the platform."
    ],
    correctAnswer: 1,
    explanation: "A clean background projects respect and professionalism. Audiences associate this order with high quality, making them more willing to invest financial support (gifts)."
  },
  {
    question: "Which of the following is the most effective bio format according to Pillar 1?",
    options: [
      "A blank bio to maintain mystery.",
      "A list of your favorite foods and emojis.",
      "An elevator pitch stating your talent, stream schedule, timezone, and community tribe name.",
      "A long letter describing your life history."
    ],
    correctAnswer: 2,
    explanation: "An elevator pitch stating your talent, hours (with timezone), and tribe name provides instant cognitive fluency, giving visitors a clear reason to follow."
  }
];

// Block 1 Scenario Flashcards
const BLOCK1_FLASHCARDS = [
  {
    id: 1,
    scenario: "A viewer clicks into your stream, watches for 4 seconds in absolute silence while you look down scrolling on your phone, and then exits the room.",
    action: "The 'Digital Handshake' failed due to a presence gap. The viewer felt ignored, interpreting your silence as a lack of welcoming energy. To resolve this, maintain continuous vocal flow (speaking, reacting, describing what you do) even if the chat is inactive."
  },
  {
    id: 2,
    scenario: "You decide to stream in a dimly lit room with your bed visible in the background, thinking it creates a cozy vibe. Average watch time drops by 50%.",
    action: "The 'Atmosphere of Respect' was breached. Poor lighting and domestic clutter signal amateurism, driving exit rates. Set up warm, front-facing lighting to highlight your eyes and use a clean background to project value."
  },
  {
    id: 3,
    scenario: "You feel intense anxiety before going live, worrying that viewers will criticize your appearance, personality, or interests.",
    action: "You are failing to separate your raw self from your 'Streamer Persona.' Use your optimized profile as professional 'armor.' View the stream as a theatrical stage; criticism is about the performance, not your personal worth."
  },
  {
    id: 4,
    scenario: "You change your stream starting time from 8:00 PM to 11:00 PM on short notice because you feel tired. Your top gifter is absent and chat drops.",
    action: "You fragmented the 'Anchoring Effect' and broke the viewer's Pavlovian daily habit. Stick to fixed hours. If you must adjust, post a formatted schedule change in your Fanclub GC at least 2 hours in advance."
  },
  {
    id: 5,
    scenario: "A viewer enters your stream, chats for a few minutes, but refuses to follow or join your Fanclub, despite enjoying your conversation.",
    action: "The 'Trust and Reciprocity Threshold' was not met. Explicity reference your 'Tribe Name' and describe the exclusive community benefits of joining the Fanclub (e.g. GC access), turning a visitor into a member of your tribe."
  }
];

export function LearningResources() {
  const location = useLocation();

  // Navigation & View settings
  const [activeTab, setActiveTab] = useState<'study' | 'toolkit' | 'certifications'>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as any;
    if (['study', 'toolkit', 'certifications'].includes(tabParam)) {
      return tabParam;
    }
    return 'study';
  });

  const [persona, setPersona] = useState<'host' | 'manager'>('host');
  const [activeBlock, setActiveBlock] = useState<1 | 2 | 3>(1);
  const [readerOpen, setReaderOpen] = useState(false);

  // Flashcards state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Exam state
  const [examActive, setExamActive] = useState(false);
  const [activeExamType, setActiveExamType] = useState<'level1' | 'level2' | 'final' | null>(null);
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examQuestionIdx, setExamQuestionIdx] = useState(0);
  const [examSelectedOption, setExamSelectedOption] = useState<number | null>(null);
  const [examScore, setExamScore] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [examScoresHistory, setExamScoresHistory] = useState<ExamScore[]>([]);

  // Toolkit: AI Message Generator State
  const [msgGoal, setMsgGoal] = useState('thank-vip');
  const [msgTone, setMsgTone] = useState('warm');
  const [msgVIPName, setMsgVIPName] = useState('');
  const [msgHostName, setMsgHostName] = useState('');
  const [msgTribeName, setMsgTribeName] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Toolkit: Strategic Earning Calculator State
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Badges state
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);

  // Storage auth context
  const authState = Storage.getAuthState();

  useEffect(() => {
    const role = (authState.role || '').toLowerCase();
    if (['manager', 'agent', 'director', 'admin', 'head admin', 'head_admin'].includes(role)) {
      setPersona('manager');
    } else {
      setPersona('host');
    }
  }, [authState.role]);

  // Load scores and badges from localStorage on mount
  useEffect(() => {
    try {
      const savedScores = localStorage.getItem('nine_review_center_scores');
      if (savedScores) {
        setExamScoresHistory(JSON.parse(savedScores));
      }
      const savedBadges = localStorage.getItem('nine_review_center_badges');
      if (savedBadges) {
        setUnlockedBadges(JSON.parse(savedBadges));
      }
    } catch (e) {
      console.error('Failed to load review center state:', e);
    }
  }, []);

  const saveExamScore = (category: string, score: number, total: number, passed: boolean) => {
    const newEntry: ExamScore = {
      category,
      score,
      total,
      passed,
      timestamp: new Date().toLocaleString()
    };
    const updated = [newEntry, ...examScoresHistory];
    setExamScoresHistory(updated);
    localStorage.setItem('nine_review_center_scores', JSON.stringify(updated));

    if (passed) {
      let badgeName = '';
      if (category === 'foundations') badgeName = 'Foundations Specialist';
      if (category === 'growth') badgeName = 'Growth Architect';
      if (category === 'mastery') badgeName = 'Master Streamer';

      if (badgeName && !unlockedBadges.includes(badgeName)) {
        const updatedBadges = [...unlockedBadges, badgeName];
        setUnlockedBadges(updatedBadges);
        localStorage.setItem('nine_review_center_badges', JSON.stringify(updatedBadges));
      }
    }
  };

  // Run AI Message Generation
  const handleGenerateMessage = () => {
    const vip = msgVIPName.trim() || '[Supporter Name]';
    const host = msgHostName.trim() || authState.nickname || authState.name || '[Host Name]';
    const tribe = msgTribeName.trim() || 'our community';

    let templates: Record<string, Record<string, string>> = {
      'thank-vip': {
        'warm': `🌟 Dearest ${vip}! My heart is overflowing with gratitude for your incredible kindness during our stream. Your support makes the ${tribe} family possible! Love, ${host} 💖`,
        'hype': `🔥 BOOM! A massive shoutout to the legend ${vip}! You absolutely blew the room away today! Thank you for backing the ${tribe} goals. Let's keep setting records! 🚀`,
        'pro': `Hello ${vip}, I want to formally express my appreciation for your significant contribution to today's broadcast. Your support helps strengthen the foundation of our ${tribe} community. Sincerely, ${host}.`
      },
      'announce-pk': {
        'warm': `✨ Hello ${tribe} family! We have an exciting PK match scheduled for tomorrow. It would mean the world to have you there as we face this challenge together. Let's make it a memorable night! 💫`,
        'hype': `⚔️ NINER TRIBE, BRACE YOURSELVES! Major Random PK tomorrow at 9 PM PHT! We need every active shield in the room. Let's dominate the scoreboard and show what our tribe is made of! 🛡️🔥`,
        'pro': `Dear members, please note that our next strategic PK event is scheduled for tomorrow. Your attendance and support are highly valued as we aim for our milestone target. See you there.`
      },
      'apology-delay': {
        'warm': `🌸 Hi ${tribe} family, I am so sorry, but I need to delay today's stream start. I will be going live at [Time] instead. Thank you for your patience and understanding. Can't wait to see you!`,
        'hype': `⚡ Quick update tribe! A slight schedule shift today—we are pushing the start back to [Time] to make sure the audio setup is 100% hyped and ready. Get ready for an epic session!`,
        'pro': `Attention ${tribe}: Today's live broadcast will be postponed by [Duration] due to unforeseen schedule conflicts. We will resume at [Time]. Thank you for your cooperation.`
      },
      'pre-stream': {
        'warm': `✨ Hey ${tribe} family! Preparing to go live in 10 minutes! Tonight, we are focusing on connection and sharing some cozy vibes. Can't wait to see you there! Love, ${host} 💕`,
        'hype': `🔥 NINER TRIBE, GET HYPED! Streaming starts in 10 minutes! We are running major PK matches and chasing our milestone target. Back the room and let's dominate! 🚀 see you there!`,
        'pro': `Dear members of ${tribe}, this is a notification that our broadcast will commence in 10 minutes. We will cover key performance goals and interactive activities. Sincerely, ${host}.`
      },
      'post-stream': {
        'warm': `🌟 Dearest ${tribe} family! Stream is officially wrapped. Thank you so much for spending your valuable time with me tonight. Extra special thanks to ${vip} for the beautiful support! Sleep well! 💖`,
        'hype': `🔥 WHAT A STREAM! We absolutely crushed the goals tonight! Thank you ${tribe} for the massive shield and energy, and shoutout to ${vip} for leading the charge! Next session is going to be epic! 🚀`,
        'pro': `Dear ${tribe}, today's broadcast has successfully concluded. We appreciate your participation and support, particularly from ${vip}. We look forward to our next scheduled session. Regards, ${host}.`
      }
    };

    const result = templates[msgGoal]?.[msgTone] || '';
    setGeneratedMsg(result);
    setCopiedMsg(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    return true;
  };

  // Block Quiz handlers
  const handleStartQuiz = () => {
    setQuizActive(true);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleSelectOption = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;
    
    const question = BLOCK1_QUIZ_QUESTIONS[currentQuestionIdx];
    const isCorrect = selectedOption === question.correctAnswer;
    
    if (!showExplanation) {
      if (isCorrect) setQuizScore(prev => prev + 1);
      setShowExplanation(true);
    } else {
      if (currentQuestionIdx < BLOCK1_QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
        setSelectedOption(null);
        setShowExplanation(false);
      } else {
        setQuizFinished(true);
      }
    }
  };

  // Level Exam Handlers
  const handleStartExam = (type: 'level1' | 'level2' | 'final') => {
    setActiveExamType(type);
    setExamActive(true);
    setExamQuestionIdx(0);
    setExamSelectedOption(null);
    setExamScore(0);
    setExamFinished(false);

    // Build exam questions (shuffled from block questions or mock scenarios)
    const baseQuestions = [...BLOCK1_QUIZ_QUESTIONS];
    if (type === 'level1') {
      setExamQuestions(baseQuestions.slice(0, 8)); // 8 questions for level 1
    } else if (type === 'level2') {
      setExamQuestions(baseQuestions.slice(2, 10)); // 8 questions for level 2
    } else {
      setExamQuestions(baseQuestions); // 10 questions for final
    }
  };

  const handleNextExamQuestion = () => {
    if (examSelectedOption === null) return;
    const question = examQuestions[examQuestionIdx];
    if (examSelectedOption === question.correctAnswer) {
      setExamScore(prev => prev + 1);
    }
    
    if (examQuestionIdx < examQuestions.length - 1) {
      setExamQuestionIdx(prev => prev + 1);
      setExamSelectedOption(null);
    } else {
      setExamFinished(true);
      const passed = (examScore + (examSelectedOption === question.correctAnswer ? 1 : 0)) / examQuestions.length >= 0.8;
      const finalScore = examScore + (examSelectedOption === question.correctAnswer ? 1 : 0);
      
      let category = 'foundations';
      if (activeExamType === 'level2') category = 'growth';
      if (activeExamType === 'final') category = 'mastery';
      
      saveExamScore(category, finalScore, examQuestions.length, passed);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">REVIEW & EXAMINATION PLATFORM</span>
          <h2 className="text-xl font-black text-white font-['Outfit'] tracking-wide uppercase mt-1">Learning Hub</h2>
          <p className="text-xs text-[#A09E9A] mt-1">
            Master the dual psychology of host confidence and viewer engagement. Complete Block study materials to unlock exams and tools.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 self-start shrink-0">
          {[
            { id: 'study', label: 'Study Center', icon: BookOpen },
            { id: 'toolkit', label: 'Fanclub Toolkit', icon: Calculator },
            { id: 'certifications', label: 'Certifications', icon: Trophy }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                  : 'text-[#A09E9A] hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Warning Notice Banner */}
      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-3 rounded-2xl flex items-center gap-3 text-xs text-[#D4AF37]">
        <AlertTriangle size={16} className="shrink-0" />
        <span>⚠️ Note: Your examination scores will be officially recorded in your training history.</span>
      </div>

      {/* ==================== TAB: STUDY CENTER ==================== */}
      {activeTab === 'study' && (
        <div className="space-y-6">
          {!readerOpen && !quizActive && !examActive && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Block 1 Selection */}
              <div className="glass-card flex flex-col gap-4 border-t-2 border-t-[#D4AF37]">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
                    <BookOpen size={20} />
                  </div>
                  <span className="text-[10px] font-black bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded-full uppercase">Pillars 1-3</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Block 1: The Foundation</h3>
                  <p className="text-xs text-[#A09E9A] mt-1.5 leading-relaxed">
                    Establish your digital handshake, sensory environment, and daily anchor routine. Master the basic setup.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveBlock(1); setReaderOpen(true); }}
                  className="mt-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all text-center cursor-pointer border border-white/5"
                >
                  Start Studying
                </button>
              </div>

              {/* Block 2 Selection */}
              <div className="glass-card flex flex-col gap-4 border-t-2 border-t-blue-500 opacity-90">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Flame size={20} />
                  </div>
                  <span className="text-[10px] font-black bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full uppercase">Pillars 4-6</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Block 2: The Engagement</h3>
                  <p className="text-xs text-[#A09E9A] mt-1.5 leading-relaxed">
                    Optimize visibility investments, eliminate vocal dead-air, and master the viewer conversion funnel.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveBlock(2); setReaderOpen(true); }}
                  className="mt-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all text-center cursor-pointer border border-white/5"
                >
                  Start Studying
                </button>
              </div>

              {/* Block 3 Selection */}
              <div className="glass-card flex flex-col gap-4 border-t-2 border-t-purple-500 opacity-90">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-[10px] font-black bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full uppercase">Pillars 7-9</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Block 3: The Monetization</h3>
                  <p className="text-xs text-[#A09E9A] mt-1.5 leading-relaxed">
                    Run emotional supporter retention loops, structure high-converting gratitude loops, and set strategic goals.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveBlock(3); setReaderOpen(true); }}
                  className="mt-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all text-center cursor-pointer border border-white/5"
                >
                  Start Studying
                </button>
              </div>
            </div>
          )}

          {/* CURRICULUM READER PANEL */}
          {readerOpen && !quizActive && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Reading Content */}
              <div className="lg:col-span-2 glass-card space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <button 
                    onClick={() => setReaderOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/5 text-[#A09E9A] hover:text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div>
                    <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">BLOCK {activeBlock} CURRICULUM</span>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      {activeBlock === 1 ? 'Block 1: Foundations (Pillars 1-3)' : 
                       activeBlock === 2 ? 'Block 2: Engagement (Pillars 4-6)' : 
                       'Block 3: Monetization (Pillars 7-9)'}
                    </h3>
                  </div>
                </div>

                {activeBlock === 1 ? (
                  <div className="space-y-6 text-xs text-[#A09E9A] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Pillar 1 */}
                    <div className="space-y-3">
                      <h4 className="text-white font-black text-sm border-b border-white/5 pb-1 uppercase tracking-wide">
                        Pillar 1: Profile Optimization (The Digital Handshake)
                      </h4>
                      <p>
                        Your profile is your digital storefront. In live streaming, a user makes a subconscious decision to stay or exit within the first <strong>3 seconds</strong> of clicking your thumbnail. This is the "Digital Handshake."
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-[#D4AF37] font-black block uppercase text-[9px] tracking-widest mb-1">Host's Psychology (Internal)</span>
                          Having a polished visual profile acts as professional "armor," separating the host's raw self from their streamer persona. This reduces impostor syndrome and performance anxiety.
                        </div>
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-blue-400 font-black block uppercase text-[9px] tracking-widest mb-1">Audience's Psychology (External)</span>
                          Reduces cognitive load by creating immediate visual fluency. The Halo and Bandwagon effects make viewers associate visual polish with talent and community status.
                        </div>
                      </div>
                    </div>

                    {/* Pillar 2 */}
                    <div className="space-y-3">
                      <h4 className="text-white font-black text-sm border-b border-white/5 pb-1 uppercase tracking-wide">
                        Pillar 2: Stream Quality & Atmosphere (The Safe Haven)
                      </h4>
                      <p>
                        Your stream is a physical and sensory environment. If a viewer experiences auditory or visual discomfort, they will exit immediately, regardless of how entertaining you are.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-[#D4AF37] font-black block uppercase text-[9px] tracking-widest mb-1">Host's Psychology (Internal)</span>
                          Pre-testing and resolving audio and lighting issues reduces technical panic and stress hormones, letting the host focus fully on conversation.
                        </div>
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-blue-400 font-black block uppercase text-[9px] tracking-widest mb-1">Audience's Psychology (External)</span>
                          Clean audio eliminates listening fatigue. Highlighting the eyes with warm, front-facing lighting simulates eye contact, building oxytocin and parasocial warmth.
                        </div>
                      </div>
                    </div>

                    {/* Pillar 3 */}
                    <div className="space-y-3">
                      <h4 className="text-white font-black text-sm border-b border-white/5 pb-1 uppercase tracking-wide">
                        Pillar 3: Timing, Consistency & Schedules (The Anchoring Effect)
                      </h4>
                      <p>
                        Consistency is the heartbeat of community building. A host who streams erratically is treating their broadcast as a hobby, while a host with a fixed schedule treats it as a television show.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-[#D4AF37] font-black block uppercase text-[9px] tracking-widest mb-1">Host's Psychology (Internal)</span>
                          Fixed times eliminate decision resistance ("when should I go live?"), reducing procrastination and helping pace personal energy.
                        </div>
                        <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5">
                          <span className="text-blue-400 font-black block uppercase text-[9px] tracking-widest mb-1">Audience's Psychology (External)</span>
                          Creates Pavlovian habit loops, anchoring the stream into the viewer's daily calendar. Proactive cancellation notices prevent abandonment anxiety.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#5A5865] space-y-4">
                    <Info size={24} className="mx-auto text-blue-500/50" />
                    <p>
                      Block {activeBlock} reading materials are currently in review by the instructional design board. 
                      You can explore the interactive toolkit or proceed to exams if you have studied Category A materials.
                    </p>
                  </div>
                )}

                {/* Study Progress Controls */}
                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-[10px] text-[#5A5865] font-black uppercase">Study Mode Active</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReaderOpen(false)}
                      className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-bold text-[#A09E9A]"
                    >
                      Close Reader
                    </button>
                    {activeBlock === 1 && (
                      <button
                        onClick={handleStartQuiz}
                        className="btn-gold px-5 py-2 text-xs"
                      >
                        Start Block Quiz
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Scenario Flashcards */}
              <div className="glass-card space-y-6">
                <div>
                  <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block">INTERACTIVE FLASHCARDS</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide mt-0.5">Scenario Study Room</h3>
                  <p className="text-[10px] text-[#A09E9A] mt-1">Review real-world scenarios and their psychological actions.</p>
                </div>

                {activeBlock === 1 ? (
                  <div className="space-y-6">
                    {/* Card container */}
                    <div 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full min-h-[180px] p-5 rounded-2xl border border-[#D4AF37]/35 bg-[#0D0D14] flex flex-col justify-between cursor-pointer hover:border-[#D4AF37] transition-all relative select-none shadow-[inset_0_0_15px_rgba(212,175,55,0.02)]"
                    >
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/40 rounded text-[8px] font-black tracking-wider text-[#A09E9A] uppercase">
                        {isFlipped ? 'BACK' : 'FRONT'}
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center text-center p-2">
                        <span className={`text-xs leading-relaxed font-semibold transition-all duration-300 ${isFlipped ? 'text-[#D4AF37] italic' : 'text-white'}`}>
                          {isFlipped ? BLOCK1_FLASHCARDS[flashcardIdx].action : BLOCK1_FLASHCARDS[flashcardIdx].scenario}
                        </span>
                      </div>
                      
                      <div className="text-center text-[9px] text-[#5A5865] uppercase tracking-widest mt-2">
                        Click card to flip
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center">
                      <button
                        disabled={flashcardIdx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlashcardIdx(prev => prev - 1);
                          setIsFlipped(false);
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs text-[#A09E9A] font-bold">
                        Card {flashcardIdx + 1} of {BLOCK1_FLASHCARDS.length}
                      </span>
                      <button
                        disabled={flashcardIdx === BLOCK1_FLASHCARDS.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlashcardIdx(prev => prev + 1);
                          setIsFlipped(false);
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#5A5865] italic">
                    Flashcards for this block are in development.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QUIZ ACTIVE VIEW */}
          {quizActive && !quizFinished && (
            <div className="glass-card max-w-xl mx-auto space-y-6 animate-fadeIn">
              {(() => {
                const question = BLOCK1_QUIZ_QUESTIONS[currentQuestionIdx];
                return (
                  <>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Block 1 Quiz: Foundations</span>
                      <span className="text-xs text-[#A09E9A] font-bold">
                        Question {currentQuestionIdx + 1} of {BLOCK1_QUIZ_QUESTIONS.length}
                      </span>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide leading-relaxed">
                        {question.question}
                      </h3>

                      <div className="flex flex-col gap-2">
                        {question.options.map((opt, oIdx) => {
                          const isSelected = selectedOption === oIdx;
                          let btnStyle = "bg-[#0D0D14] border-white/5 text-[#A09E9A] hover:bg-white/03 hover:text-white";
                          
                          if (showExplanation) {
                            if (oIdx === question.correctAnswer) {
                              btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                            } else if (isSelected) {
                              btnStyle = "bg-red-500/10 border-red-500 text-red-400";
                            }
                          } else if (isSelected) {
                            btnStyle = "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]";
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={showExplanation}
                              onClick={() => handleSelectOption(oIdx)}
                              className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-semibold ${btnStyle}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {showExplanation && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-xs text-[#A09E9A] leading-relaxed animate-fadeIn">
                          <span className="text-white font-bold block mb-1">Psychological Analysis:</span>
                          {question.explanation}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <button
                          onClick={() => { setQuizActive(false); }}
                          className="px-4 py-2 text-xs font-bold text-[#5A5865] hover:text-white"
                        >
                          Exit Quiz
                        </button>
                        
                        <button
                          onClick={handleNextQuestion}
                          disabled={selectedOption === null}
                          className="btn-gold px-5 py-2 text-xs"
                        >
                          {!showExplanation ? 'Check Answer' : 
                           currentQuestionIdx === BLOCK1_QUIZ_QUESTIONS.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* QUIZ FINISHED RESULTS */}
          {quizActive && quizFinished && (
            <div className="glass-card max-w-md mx-auto text-center py-6 space-y-6 animate-fadeIn">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] mb-2">
                <Award size={32} />
              </div>

              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Quiz Completed!</h3>
                <p className="text-xs text-[#A09E9A]">
                  Score: <strong className="text-white font-bold">{quizScore}</strong> of {BLOCK1_QUIZ_QUESTIONS.length} correct.
                </p>
              </div>

              {quizScore >= 8 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl max-w-sm mx-auto text-xs text-[#A09E9A] leading-relaxed">
                  <span className="text-emerald-400 font-bold block mb-1">🎉 BLOCK STUDIED!</span>
                  You have successfully demonstrated understanding of the psychological foundations. Optional Level 1 Exam is now unlocked!
                </div>
              ) : (
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl max-w-sm mx-auto text-xs text-red-400 leading-relaxed">
                  <span className="font-bold block mb-1">❌ RETRY REQUIRED</span>
                  You need a score of 80% (8/10 correct) to complete this block.
                </div>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => { setQuizActive(false); setQuizFinished(false); }}
                  className="px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-[#A09E9A] hover:text-white transition-all cursor-pointer"
                >
                  Close Results
                </button>
                {quizScore < 8 ? (
                  <button
                    onClick={handleStartQuiz}
                    className="btn-gold px-5 py-2 text-xs"
                  >
                    Retry Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => { setQuizActive(false); setQuizFinished(false); handleStartExam('level1'); }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    Take Level 1 Exam
                  </button>
                )}
              </div>
            </div>
          )}

          {/* EXAM ACTIVE VIEW */}
          {examActive && !examFinished && (
            <div className="glass-card max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                  ⚠️ OFFICIAL {activeExamType?.toUpperCase()} EXAM
                </span>
                <span className="text-xs text-[#A09E9A] font-bold">
                  Question {examQuestionIdx + 1} of {examQuestions.length}
                </span>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-wide leading-relaxed">
                  {examQuestions[examQuestionIdx]?.question}
                </h3>

                <div className="flex flex-col gap-2">
                  {examQuestions[examQuestionIdx]?.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => setExamSelectedOption(oIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-semibold ${
                        examSelectedOption === oIdx
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-[#0D0D14] border-white/5 text-[#A09E9A] hover:bg-white/03 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <button
                    onClick={() => { setExamActive(false); }}
                    className="px-4 py-2 text-xs font-bold text-[#5A5865] hover:text-white"
                  >
                    Exit Exam
                  </button>
                  
                  <button
                    onClick={handleNextExamQuestion}
                    disabled={examSelectedOption === null}
                    className="btn-gold px-5 py-2 text-xs"
                  >
                    {examQuestionIdx === examQuestions.length - 1 ? 'Finish Exam' : 'Next Question'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EXAM FINISHED RESULTS */}
          {examActive && examFinished && (
            <div className="glass-card max-w-md mx-auto text-center py-6 space-y-6 animate-fadeIn">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-2">
                <GraduationCap size={32} />
              </div>

              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Exam Completed!</h3>
                <p className="text-xs text-[#A09E9A]">
                  You answered <strong className="text-white font-bold">{examScore}</strong> of {examQuestions.length} questions correctly.
                </p>
              </div>

              {examScore / examQuestions.length >= 0.8 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl max-w-sm mx-auto text-xs text-emerald-400 leading-relaxed">
                  <span className="font-bold block mb-1">🎉 EXAM PASSED!</span>
                  Your score has been registered in your transcript. You have officially unlocked the badge.
                </div>
              ) : (
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl max-w-sm mx-auto text-xs text-red-400 leading-relaxed">
                  <span className="font-bold block mb-1">❌ FAILED</span>
                  You scored {Math.round((examScore / examQuestions.length) * 100)}% which is below the 80% passing threshold. Please study and try again.
                </div>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => { setExamActive(false); setExamFinished(false); }}
                  className="px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-[#A09E9A] transition-all cursor-pointer"
                >
                  Back to Hub
                </button>
                {examScore / examQuestions.length < 0.8 && (
                  <button
                    onClick={() => handleStartExam(activeExamType!)}
                    className="btn-gold px-5 py-2 text-xs"
                  >
                    Retry Exam
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: FANCLUB ENGAGEMENT TOOLKIT ==================== */}
      {activeTab === 'toolkit' && (
        <div className="max-w-2xl mx-auto">
          {/* AI Message Generator */}
          <div className="glass-card flex flex-col gap-4">
            <div>
              <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block">UTILITY DASHBOARD</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wide mt-0.5">AI Message Generator</h3>
              <p className="text-[10px] text-[#A09E9A] mt-1">Generate high-converting community broadcast updates.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white font-bold block mb-1 uppercase">Select Objective</label>
                <select
                  value={msgGoal}
                  onChange={(e) => setMsgGoal(e.target.value)}
                  className="w-full bg-[#0D0D14] border border-white/5 rounded-xl p-2.5 text-xs text-[#A09E9A] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="thank-vip">Thank Top Gifter / VIP</option>
                  <option value="announce-pk">Announce Upcoming PK Match</option>
                  <option value="apology-delay">Absence or Delay Apology</option>
                  <option value="pre-stream">Pre-stream Update (Teaser/Alert)</option>
                  <option value="post-stream">Post-stream Update (Recap/Grateful)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-white font-bold block mb-1 uppercase">Select Tone</label>
                <select
                  value={msgTone}
                  onChange={(e) => setMsgTone(e.target.value)}
                  className="w-full bg-[#0D0D14] border border-white/5 rounded-xl p-2.5 text-xs text-[#A09E9A] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="warm">Warm & Grateful (Psychology of Belonging)</option>
                  <option value="hype">Hype & High-Energy (Bandwagon Trigger)</option>
                  <option value="pro">Professional & Polite (Prestige Value)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#A09E9A] font-bold block mb-1 uppercase">VIP Name</label>
                  <input
                    type="text"
                    value={msgVIPName}
                    onChange={(e) => setMsgVIPName(e.target.value)}
                    placeholder="e.g. JohnD"
                    className="w-full bg-[#0D0D14] border border-white/5 rounded-xl p-2 text-xs text-[#A09E9A] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#A09E9A] font-bold block mb-1 uppercase">Tribe Name</label>
                  <input
                    type="text"
                    value={msgTribeName}
                    onChange={(e) => setMsgTribeName(e.target.value)}
                    placeholder="e.g. Niners"
                    className="w-full bg-[#0D0D14] border border-white/5 rounded-xl p-2 text-xs text-[#A09E9A] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateMessage}
                className="btn-gold py-2.5 w-full text-center flex items-center justify-center gap-2 text-xs"
              >
                <Sparkles size={14} />
                <span>Generate Broadcast Template</span>
              </button>
            </div>

            {generatedMsg && (
              <div className="bg-[#0D0D14] border border-white/5 p-3 rounded-2xl space-y-3 animate-fadeIn">
                <span className="text-[9px] text-[#A09E9A] font-black uppercase block">GENERATED TEXT</span>
                <p className="text-xs text-white leading-relaxed font-serif italic select-all">"{generatedMsg}"</p>
                <button
                  onClick={() => {
                    copyToClipboard(generatedMsg);
                    setCopiedMsg(true);
                    setTimeout(() => setCopiedMsg(false), 2000);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedMsg ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedMsg ? 'Copied to Clipboard' : 'Copy Message'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: CERTIFICATIONS ==================== */}
      {activeTab === 'certifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Badges & Accreditation */}
          <div className="glass-card flex flex-col gap-4">
            <div>
              <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block">ACCREDITATIONS</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wide mt-0.5">Accredited Badges</h3>
              <p className="text-[10px] text-[#A09E9A] mt-1">Badges unlocked by completing exams.</p>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Foundations Specialist', desc: 'Category A: Pillars 1-3. Focuses on stream setups and basic schedules.', examType: 'level1' },
                { name: 'Growth Architect', desc: 'Category B: Pillars 4-6. Focuses on conversion rate and dead-air mitigation.', examType: 'level2' },
                { name: 'Master Streamer', desc: 'Category C: Pillars 7-9. Focuses on strategic monetization and supporter retention.', examType: 'final' }
              ].map((badge, idx) => {
                const unlocked = unlockedBadges.includes(badge.name);
                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                      unlocked 
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white' 
                        : 'bg-[#0D0D14]/60 border-white/5 text-[#A09E9A]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${unlocked ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-[#5A5865]'}`}>
                      <Award size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide truncate">{badge.name}</p>
                      <p className="text-[10px] text-[#A09E9A] leading-relaxed mt-0.5">{badge.desc}</p>
                      
                      {!unlocked && (
                        <button
                          onClick={() => handleStartExam(badge.examType as any)}
                          className="mt-2 text-[10px] text-[#D4AF37] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Take Examination</span>
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Historical Transcript */}
          <div className="lg:col-span-2 glass-card flex flex-col gap-4">
            <div>
              <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block">TRANSCRIPT LOGS</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wide mt-0.5">Recorded Examination History</h3>
              <p className="text-[10px] text-[#A09E9A] mt-1">Official records of your study center test scores.</p>
            </div>

            {examScoresHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5A5865] italic border border-dashed border-white/5 rounded-2xl">
                No examination records registered yet. Pass a Block quiz to unlock Level examinations.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/5 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/02 text-[#A09E9A] border-b border-white/5 font-black uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Examination Category</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Percentage</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {examScoresHistory.map((score, index) => (
                      <tr key={index} className="text-[#A09E9A] hover:bg-white/03 transition-all">
                        <td className="py-3 px-3 font-bold text-white">
                          {score.category === 'foundations' ? 'Category A: Foundations Exam' :
                           score.category === 'growth' ? 'Category B: Growth Exam' :
                           score.category === 'mastery' ? 'Category C: Mastery Exam' : score.category}
                        </td>
                        <td className="py-3 px-3 font-mono">{score.score} / {score.total}</td>
                        <td className="py-3 px-3 font-mono">{Math.round((score.score / score.total) * 100)}%</td>
                        <td className="py-3 px-3 text-[10px]">{score.timestamp}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            score.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {score.passed ? 'PASSED' : 'RETRY'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
