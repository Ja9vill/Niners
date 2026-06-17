import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Award,
  Info,
  Trophy,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  pillar: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export function LearningResourcesTab() {
  // Navigation States: 'curriculum' | 'flashcards' | 'quiz'
  const [activeMode, setActiveMode] = useState<'curriculum' | 'flashcards' | 'quiz'>('curriculum');

  // Curriculum State: 0 | 1 | 2 (Pillars)
  const [activePillar, setActivePillar] = useState<number>(0);

  // Flashcards States
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<number[]>([]);

  // Quiz States
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Array<{ questionIdx: number; selectedOption: number; correct: boolean }>>([]);
  const [showResultsReview, setShowResultsReview] = useState(false);

  // Flashcard Deck Definition (15 questions)
  const flashcards: Flashcard[] = [
    {
      id: 1,
      pillar: 'Profile Optimization',
      question: 'What is the "3-Second Rule" for welcoming viewers?',
      answer: 'Greet every entering viewer by name within 3 seconds of their arrival. It builds immediate connection, decreases bounce rates, and signals the Poppo algorithm that your stream is highly interactive.'
    },
    {
      id: 2,
      pillar: 'Profile Optimization',
      question: 'What is the required crop and layout standard for your main profile Cover Photo?',
      answer: 'A high-resolution 9:16 vertical crop centered on the host’s face (shoulders up) with soft, natural lighting. The picture must contain no text overlays, no heavy watermarks, no agency stamps, and no extreme filters.'
    },
    {
      id: 3,
      pillar: 'Earning Mechanics',
      question: 'What is the points-to-USD conversion rate on Poppo Live?',
      answer: '10,000 points equal exactly $1 USD. This flat conversion rate applies to both host gift earnings and agency commission calculations.'
    },
    {
      id: 4,
      pillar: 'Profile Optimization',
      question: 'What are the timing and voice requirements for the platform Voice Introduction?',
      answer: 'The voice recording must be between 10 and 15 seconds long. It should be spoken in a clear, high-energy voice, stating your name, stream times, and inviting viewers to follow your room.'
    },
    {
      id: 5,
      pillar: 'Earning Mechanics',
      question: 'What is the primary host benefit of scheduling a Livehouse Event?',
      answer: 'Scheduling an official Livehouse slot grants the host prime banner exposure on the Poppo Live homepage, funneling a massive wave of organic traffic to the live room during the event.'
    },
    {
      id: 6,
      pillar: 'Profile Optimization',
      question: 'What does a standard Three-Point Lighting setup consist of for streaming?',
      answer: 'Key Light (primary light facing host), Fill Light (placed on opposite side to soften face shadows), and Backlight/Accent Light (positioned behind host to create outline separation from the background).'
    },
    {
      id: 7,
      pillar: 'Earning Mechanics',
      question: 'How do PK Battles boost overall points and popularity?',
      answer: 'PK Battles create competitive urgency and time limits (usually 5 minutes). Fans gift rapidly to protect their host from penalty punishments, which drives up coin counts and pushes the host up leaderboard rankings.'
    },
    {
      id: 8,
      pillar: 'Earning Mechanics',
      question: 'When is the most strategic time to open a Lucky Box in your room?',
      answer: 'Open a Lucky Box when room traffic is growing or right before starting a PK. The timer encourages viewers to stay in the room for the countdown, boosting algorithmic retention metrics.'
    },
    {
      id: 9,
      pillar: 'Earning Mechanics',
      question: 'What is the Talent Auction on Poppo Live?',
      answer: 'An agency-sponsored event where new or verified hosts register to be bid on by agency supporters, establishing early fanbase backing and boosting initial point targets.'
    },
    {
      id: 10,
      pillar: 'Live Interaction',
      question: 'Why should hosts invite viewers to take "Voice Seats" (Multi-Guest)?',
      answer: 'Voice seats increase user participation, converting passive viewers into co-hosts. This deepens community ties, increases room stay time, and enhances the stream’s overall retention score.'
    },
    {
      id: 11,
      pillar: 'Live Interaction',
      question: 'What is the minimum recommended number of Song Requests to display per stream?',
      answer: 'At least 9 song requests should be prominently displayed on your stream overlay or pin. This gives viewers a structured interaction loop and encourages them to send gifts for requests.'
    },
    {
      id: 12,
      pillar: 'Live Interaction',
      question: 'How far in advance should you share pre-stream updates or schedule announcements?',
      answer: 'Post schedule announcements 30 to 60 minutes before going live. Inform your fanbase GC (Group Chat) about your stream theme, goals, and special guests to maximize attendance.'
    },
    {
      id: 13,
      pillar: 'Earning Mechanics',
      question: 'What is the minimum passing score required for the Host Training certification?',
      answer: 'Hosts must achieve an 80% score or higher on the official assessment, answering at least 24 out of 30 questions correctly, to demonstrate operational mastery.'
    },
    {
      id: 14,
      pillar: 'Live Interaction',
      question: 'What tools and permissions do appointed Room Moderators possess?',
      answer: 'Room Moderators can welcome arrivals, pin goals, manage chat behavior, mute toxic users, and kick rule violators to keep the chat space safe and positive.'
    },
    {
      id: 15,
      pillar: 'Live Interaction',
      question: 'Why is running a "silent stream" (leaving screen empty or sleeping) prohibited?',
      answer: 'Silent and passive streams violate Poppo Live’s community interactive policies. They lead to warning notices, system-level search suppression, or immediate account bans.'
    }
  ];

  // Quiz Deck Definition (30 questions)
  const quizQuestions: QuizQuestion[] = [
    {
      question: 'What is the exact conversion rate of Poppo Live points to USD?',
      options: [
        '1,000 points = $1 USD',
        '10,000 points = $1 USD',
        '100,000 points = $1 USD',
        '5,000 points = $1 USD'
      ],
      correctAnswer: 1,
      explanation: 'On Poppo Live, the standard conversion rate is 10,000 points to $1 USD. This flat rate applies universally for point balances.'
    },
    {
      question: 'Which of the following is a strict requirement for the primary profile Cover Photo?',
      options: [
        'Must contain decorative text listing your live hours',
        'Must show your clear, high-resolution portrait in 9:16 aspect ratio',
        'Must display the agency logo or official watermark',
        'Can be a scenic landscape or a photo of your pet'
      ],
      correctAnswer: 1,
      explanation: 'To pass profile reviews, the cover photo must be a high-quality, clear vertical portrait of the host (9:16 aspect ratio) with no text overlays or watermarks.'
    },
    {
      question: 'What does the "3-Second Rule" require of a livestream host?',
      options: [
        'Wait 3 seconds before ending a stream if the network glitches',
        'Greet every entering viewer by name within 3 seconds',
        'Do not play background music for the first 3 seconds of a stream',
        'Allow gifts to sit on the screen for 3 seconds before saying thank you'
      ],
      correctAnswer: 1,
      explanation: 'Greeting viewers by name within 3 seconds of arrival hooks them immediately, preventing them from scrolling past and increasing retention.'
    },
    {
      question: 'What is the acceptable length for a profile Voice Introduction?',
      options: [
        '5 to 8 seconds',
        '10 to 15 seconds',
        '30 to 45 seconds',
        'Exactly 60 seconds'
      ],
      correctAnswer: 1,
      explanation: 'The voice intro must be between 10 and 15 seconds long to remain punchy, energetic, and comply with platform limits.'
    },
    {
      question: 'Which lighting setup is standard for premium video streaming quality?',
      options: [
        'A single overhead light source to highlight hair',
        'Sitting directly in front of a bright window with no blinds',
        'Three-point lighting (Key light, Fill light, and Backlight)',
        'Pure darkness with only screen glow'
      ],
      correctAnswer: 2,
      explanation: 'Three-point lighting (Key, Fill, and Backlight) is the professional standard for removing harsh shadows and separating the host from the background.'
    },
    {
      question: 'What is the primary operational purpose of a Lucky Box?',
      options: [
        'To lock the room so only VIPs can enter',
        'To draw random traffic and encourage viewers to remain in the room for the countdown',
        'To report inappropriate chat behavior automatically',
        'To mute background audio during PK battles'
      ],
      correctAnswer: 1,
      explanation: 'Lucky Boxes reward points to viewers who stay in the room when the timer ends, boosting the stream’s retention and traffic ranking.'
    },
    {
      question: 'If a host accumulates 350,000 points, how much is this worth in USD?',
      options: [
        '$3.50 USD',
        '$35.00 USD',
        '$350.00 USD',
        '$3,500.00 USD'
      ],
      correctAnswer: 1,
      explanation: 'At a rate of 10,000 points = $1 USD, 350,000 points is calculated as 350,000 / 10,000 = $35.00 USD.'
    },
    {
      question: 'What is the best camera angle for live streaming?',
      options: [
        'Placed low on the desk looking up at the chin',
        'Placed slightly above eye level looking slightly down',
        'Positioned far to the side showing only the side profile',
        'Extreme close-up on the eyes only'
      ],
      correctAnswer: 1,
      explanation: 'Placing the camera slightly above eye level is the most flattering angle and allows natural, engaging eye contact with viewers.'
    },
    {
      question: 'What should a host do when the chat becomes completely quiet?',
      options: [
        'Stop talking and look at their phone until someone types',
        'Ask open-ended questions, play interactive music, or invite viewers to voice seats',
        'Immediately end the live stream without warning',
        'Complain about the lack of support to make viewers feel guilty'
      ],
      correctAnswer: 1,
      explanation: 'To break a quiet room, hosts should remain active by asking open-ended questions, playing music, or using multi-guest voice seats to bring fans into the conversation.'
    },
    {
      question: 'What is a PK Battle on Poppo Live?',
      options: [
        'A typing speed competition between hosts',
        'A real-time, timed competition where hosts compete for gift support points',
        'A card game played with VIP moderators',
        'A trivia game organized by the agency'
      ],
      correctAnswer: 1,
      explanation: 'A PK battle is a timed, competitive match where two hosts face off. The host whose viewers send the most gift points during the timer wins.'
    },
    {
      question: 'What is the recommended minimum target of completed song requests per stream?',
      options: [
        '1 song request',
        '5 song requests',
        '9 song requests',
        '25 song requests'
      ],
      correctAnswer: 2,
      explanation: 'Performing at least 9 song requests keeps the stream structured, interactive, and gives viewers an active reason to participate.'
    },
    {
      question: 'What is the main benefit of a Livehouse Event?',
      options: [
        'It doubles the value of all incoming gift points',
        'It grants homepage banner exposure, driving a flood of organic traffic',
        'It automatically bans trolls from entering the room',
        'It reduces the camera resolution to save internet bandwidth'
      ],
      correctAnswer: 1,
      explanation: 'Livehouse events are officially featured on the homepage, resulting in high organic traffic visibility.'
    },
    {
      question: 'Who can assign Room Moderators in a host’s stream?',
      options: [
        'Only the Agency Owner',
        'The host themselves',
        'Any VIP user who requests it',
        'The platform algorithm automatically'
      ],
      correctAnswer: 1,
      explanation: 'The host has full control over who is appointed as a Room Moderator to help manage the stream.'
    },
    {
      question: 'Which of the following is considered an acceptable PK penalty game?',
      options: [
        'Insulting the opponent host or their supporters',
        'Performing a funny dance, drawing a cute icon on the cheek, or singing',
        'Making dangerous physical gestures or stunts',
        'Remaining silent and ignoring the screen for 10 minutes'
      ],
      correctAnswer: 1,
      explanation: 'Penalty games should always be lighthearted, entertaining, respectful, and safe for all audiences.'
    },
    {
      question: 'What is the primary role of a Room Moderator?',
      options: [
        'To mute the host when they speak too loudly',
        'To welcome arrivals, pin goals, manage chat behavior, and assist the host',
        'To force viewers to send gifts to the host',
        'To change the host’s profile picture during the live stream'
      ],
      correctAnswer: 1,
      explanation: 'Moderators maintain order, help with engagement, greet new arrivals, and keep the environment clean.'
    },
    {
      question: 'Why should you post a pre-stream update message 30-60 minutes before going live?',
      options: [
        'To bypass the platform’s review system',
        'To notify followers of your schedule, theme, and goals so they can plan to join',
        'To earn free points from the agency',
        'To verify that your internet connection is active'
      ],
      correctAnswer: 1,
      explanation: 'Pre-stream updates build anticipation and give followers advance notice to attend your stream.'
    },
    {
      question: 'What is the minimum passing score for the Host Training Certification Quiz?',
      options: [
        '50%',
        '60%',
        '70%',
        '80%'
      ],
      correctAnswer: 3,
      explanation: 'An 80% passing score ensures hosts have a solid grasp of policies, engagement strategies, and operations.'
    },
    {
      question: 'Which of the following profiles is likely to get rejected during review?',
      options: [
        'A profile with a clear, well-lit vertical portrait of the host',
        'A profile with a cover photo containing heavy text, watermarks, or cartoon drawings',
        'A profile with an approved 12-second voice introduction',
        'A profile listing streaming schedules and interests in the bio'
      ],
      correctAnswer: 1,
      explanation: 'Profiles containing watermarks, heavy text, or cartoon replacements instead of actual host photos will fail review.'
    },
    {
      question: 'What is the purpose of the Talent Auction?',
      options: [
        'To sell physical goods to the highest bidder',
        'To bid on hosting equipment like microphones',
        'An event where supporters bid support points on hosts, boosting initial backing',
        'A platform to hire assistant moderators'
      ],
      correctAnswer: 2,
      explanation: 'The Talent Auction helps hosts secure initial support points and gain exposure to high-value gifters.'
    },
    {
      question: 'Why are "Voice Seats" highly effective for viewer retention?',
      options: [
        'They force viewers to turn on their cameras',
        'They make viewers feel like active co-hosts, building strong personal bonds',
        'They automatically deduct points from the viewer’s wallet',
        'They improve the audio quality of the stream'
      ],
      correctAnswer: 1,
      explanation: 'Bringing viewers into voice seats creates interactive conversations, turning passive viewers into loyal community members.'
    },
    {
      question: 'What is the ideal daily streaming duration to maximize platform algorithm recommendations?',
      options: [
        'Exactly 15 minutes',
        'At least 2 hours',
        'Exactly 10 hours without breaks',
        'Only when someone sends a gift'
      ],
      correctAnswer: 1,
      explanation: 'Streaming for at least 2 hours consistently helps the platform recommend the stream and keeps host visibility high.'
    },
    {
      question: 'Which of the following violations can lead to an immediate ban?',
      options: [
        'Streaming in a room with warm lighting',
        'Displaying violence, hate speech, or performing dangerous activities',
        'Singing a song that was not requested',
        'Having a bio that is too long'
      ],
      correctAnswer: 1,
      explanation: 'Violations of safety policies, including violence, hate speech, and dangerous activities, result in immediate bans.'
    },
    {
      question: 'What is the point value of a gift that costs 50,000 coins?',
      options: [
        '5,000 points',
        '50,000 points',
        '500,000 points',
        '10,000 points'
      ],
      correctAnswer: 1,
      explanation: 'Coins and points correspond directly; a gift worth 50,000 coins yields 50,000 points to the host.'
    },
    {
      question: 'What should you do if a viewer starts spamming or behaving inappropriately in your chat?',
      options: [
        'Argue with them and shout in the microphone',
        'Quietly mute or kick them, or let your moderator handle it',
        'Immediately end your stream and delete your account',
        'Ignore them entirely and let them spam indefinitely'
      ],
      correctAnswer: 1,
      explanation: 'The best way to handle disruptive behavior is to utilize moderation tools (mute/kick) to maintain a positive space.'
    },
    {
      question: 'What does a "Silent Stream" (host is absent or sleeping on screen) result in?',
      options: [
        'Bonus exposure from the algorithm',
        'System warnings, muting, or suspension for violating interactive rules',
        'Increased points payouts from the agency',
        'Automatic entry into the Talent Auction'
      ],
      correctAnswer: 1,
      explanation: 'Silent or sleeping streams violate interactive policies and will lead to penalties and account suspensions.'
    },
    {
      question: 'How should the background music volume be balanced during a live stream?',
      options: [
        'Loud enough to overpower the host’s voice',
        'Kept at a low, pleasant ambient level so the host’s voice is dominant',
        'Muted completely at all times',
        'Constantly changed from quiet to maximum volume'
      ],
      correctAnswer: 1,
      explanation: 'Music should be a background element that fills silence without masking the host’s voice.'
    },
    {
      question: 'What is the primary function of the Fanclub Group Chat (GC)?',
      options: [
        'To text other hosts to coordinate PKs only',
        'To keep in touch with your core community, share updates, and schedule streams',
        'To send complaints to the Poppo Live customer support',
        'To store passwords and bank details securely'
      ],
      correctAnswer: 1,
      explanation: 'The Fanclub GC is a vital community-building tool for keeping fans updated and engaged outside of stream hours.'
    },
    {
      question: 'Which of the following is NOT a good practice when a new supporter enters the room?',
      options: [
        'Sincerely thanking them for visiting and asking how their day was',
        'Demanding they send a gift immediately before you speak to them',
        'Welcoming them by reading their nickname out loud',
        'Explaining what current stream goal you are working on'
      ],
      correctAnswer: 1,
      explanation: 'Demanding gifts makes the room feel transactional and unwelcoming, which drives away potential supporters.'
    },
    {
      question: 'What is the agency’s primary role in a host’s career?',
      options: [
        'To control the host’s personal life',
        'To provide coaching, event slots, dispute resolution, and operational guidance',
        'To set the host’s microphone volume remotely',
        'To take 100% of the host’s points earnings'
      ],
      correctAnswer: 1,
      explanation: 'The agency supports talent by providing training, coordination for events, and troubleshooting platform issues.'
    },
    {
      question: 'What is the best way to handle a defeat in a PK Battle?',
      options: [
        'Get angry at your supporters for not gifting enough',
        'Congratulations to the winning host and perform your penalty game cheerfully',
        'Immediately turn off the stream in silence',
        'Report the winning host for cheating'
      ],
      correctAnswer: 1,
      explanation: 'Showing good sportsmanship and executing penalties with high energy builds respect and endears you to both audiences.'
    }
  ];

  // Helper function to toggle mastered status for flashcards
  const toggleMastered = (id: number) => {
    if (masteredCards.includes(id)) {
      setMasteredCards(masteredCards.filter((cId) => cId !== id));
    } else {
      setMasteredCards([...masteredCards, id]);
    }
  };

  // Handler for option selection
  const handleSelectOption = (optIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(optIdx);
    setIsAnswered(true);

    const correct = optIdx === quizQuestions[currentQuestionIdx].correctAnswer;
    if (correct) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers((prev) => [
      ...prev,
      {
        questionIdx: currentQuestionIdx,
        selectedOption: optIdx,
        correct
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const restartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setUserAnswers([]);
    setShowResultsReview(false);
  };

  return (
    <section className="p-6 space-y-6 max-w-5xl mx-auto text-slate-100 animate-fadeIn">
      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#21202B]/60 via-slate-900/50 to-slate-950/80 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BookOpen size={180} className="text-[#D4AF37]" />
        </div>
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <Award size={12} />
            Academy Hub
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white uppercase">
            Poppo Live Training Portal
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Master the operational principles, engagement tactics, and earning policies of Poppo Live. Study the detailed Success Pillars, test your recall with flippable cards, and pass the certification quiz to unlock agency bonuses.
          </p>
        </div>
      </header>

      {/* Main Mode Toggle Tabs */}
      <nav className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-white/5 shadow-inner">
        <button
          onClick={() => setActiveMode('curriculum')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeMode === 'curriculum'
              ? 'bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/35 shadow-md shadow-[#D4AF37]/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          Interactive Curriculum
        </button>
        <button
          onClick={() => {
            setActiveMode('flashcards');
            setIsFlipped(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeMode === 'flashcards'
              ? 'bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/35 shadow-md shadow-[#D4AF37]/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Zap size={16} />
          Flashcards Study ({flashcards.length})
        </button>
        <button
          onClick={() => setActiveMode('quiz')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeMode === 'quiz'
              ? 'bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/35 shadow-md shadow-[#D4AF37]/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles size={16} />
          Certification Quiz (30 Qs)
        </button>
      </nav>

      {/* ================= MODE: INTERACTIVE CURRICULUM ================= */}
      {activeMode === 'curriculum' && (
        <div className="space-y-6">
          {/* Sub-tabs for Success Pillars */}
          <div className="flex flex-col sm:flex-row gap-2 border-b border-white/5 pb-2">
            {[
              { label: 'Pillar 1: Profile & Attractiveness', icon: Lightbulb },
              { label: 'Pillar 2: Interaction & Retention', icon: Users },
              { label: 'Pillar 3: Earnings & Operations', icon: ShieldCheck }
            ].map((pillar, idx) => {
              const PillarIcon = pillar.icon || Info;
              return (
                <button
                  key={pillar.label}
                  onClick={() => setActivePillar(idx)}
                  className={`flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                    activePillar === idx
                      ? 'bg-slate-800 text-white border-b-2 border-[#D4AF37]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <PillarIcon size={14} className={activePillar === idx ? 'text-[#D4AF37]' : 'text-slate-400'} />
                  {pillar.label}
                </button>
              );
            })}
          </div>

          {/* Pillar 1 Detail panel */}
          {activePillar === 0 && (
            <div className="space-y-6 bg-[#21202B]/40 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 border-b border-white/5 pb-3">
                <Lightbulb size={20} className="text-[#D4AF37]" />
                Pillar 1: Profile Optimization & Attractiveness
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Subsection 1 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">1.1</span>
                    Cover Photo Standards
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your primary cover photo is the single most important factor for click-through rate. It is evaluated by automated algorithms and human auditors.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Vertical 9:16 portrait orientation only.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Face must be fully centered and clear (shoulders up).
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      No text overlays, watermarks, or emojis.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      No heavily filtered, blurry, or low-resolution crops.
                    </li>
                  </ul>
                </div>

                {/* Subsection 2 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">1.2</span>
                    Bio & Voice Intro
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A complete profile converts visitors into long-term followers. Personalize your branding details to establish expectations.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Voice Intro must be exactly 10 to 15 seconds.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Record in a clear, silent room with positive energy.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      State your streaming hours (e.g. "Daily 8-11 PM EST").
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Highlight 2-3 specific hobbies, talents, or topics.
                    </li>
                  </ul>
                </div>

                {/* Subsection 3 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">1.3</span>
                    Studio Space & Framing
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Visual fidelity determines viewer stay time. A premium aesthetic validates support and creates a professional atmosphere.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Position camera slightly above eye level looking down.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Use Key, Fill, and Backlight (Three-Point Light).
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Ensure the background is tidy, using warm decorative LEDs.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Avoid ceiling-only lighting which creates dark eye shadows.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Tip Callout Box */}
              <div className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 flex items-start gap-3">
                <Info className="text-[#D4AF37] flex-shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Agency Quality Guideline</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Always test your camera resolution in a 30-second private test stream before committing to public slots. The platform algorithm ranks streams with high bitrate and stable audio connections significantly higher, automatically driving more traffic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pillar 2 Detail panel */}
          {activePillar === 1 && (
            <div className="space-y-6 bg-[#21202B]/40 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 border-b border-white/5 pb-3">
                <Users size={20} className="text-[#D4AF37]" />
                Pillar 2: Live Stream Interaction & Viewer Retention
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Subsection 1 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">2.1</span>
                    The 3-Second Rule & Greeting
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Viewers decide to stay or scroll within the first few seconds of entering. Greet every new arrival immediately.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Acknowledge user’s nickname out loud within 3 seconds.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Keep greeting enthusiastic: "Welcome in, [Name]!"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Briefly describe your current goal or topic to arrivals.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Never demand gifts right when a viewer enters.
                    </li>
                  </ul>
                </div>

                {/* Subsection 2 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">2.2</span>
                    Engagement Loops & Requests
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Create structured paths for participation. A structured room keeps traffic engaged and active.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Always maintain a pin with at least 9 Song Requests.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Prepare 5 conversation prompts before starting.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Promote fanclub milestones and VIP goals in chat pins.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Avoid dead air by keeping background music levels stable.
                    </li>
                  </ul>
                </div>

                {/* Subsection 3 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">2.3</span>
                    Co-hosting & Voice Seats
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Voice seats convert passive spectators into core community members. Bringing users onto seats builds loyalty.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Invite active chatters or VIP supporters to Multi-Guest seats.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Utilize voice seats for casual group discussions.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Co-hosts help drive host support targets during battles.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Ensure guest seat users comply with safety guidelines.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Tip Callout Box */}
              <div className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 flex items-start gap-3">
                <Lightbulb className="text-[#D4AF37] flex-shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Viewer Retention Strategy</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If your stream becomes quiet, do not sit silently. Address viewers on the entry list, tell a personal story, run a quick poll, or start a random PK. The algorithm evaluates your verbal activity; silent rooms are automatically downranked in traffic priority.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pillar 3 Detail panel */}
          {activePillar === 2 && (
            <div className="space-y-6 bg-[#21202B]/40 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 border-b border-white/5 pb-3">
                <ShieldCheck size={20} className="text-[#D4AF37]" />
                Pillar 3: Earning Mechanics & Agency Operations
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Subsection 1 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">3.1</span>
                    PK Battles & Match Play
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    PK Battles are a primary driver of point spikes. They create healthy competitive drama and encourage fans to support.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Keep matches friendly and maintain clean sportsmanship.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Design fun, safe penalty games (singing, funny filters).
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Coordinate support targets with your room moderators.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Avoid arguments, toxic behaviors, or policy violations during PKs.
                    </li>
                  </ul>
                </div>

                {/* Subsection 2 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">3.2</span>
                    Lucky Box Optimization
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Lucky Boxes are point-based tools that keep users in your room. Optimizing their placement builds stream stability.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Open boxes when your stream is experiencing traffic inflows.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Use countdown timers to retain audiences during quiet transitions.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Leverage standard gift thresholds to set up boxes.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Do not open boxes when your room is completely empty.
                    </li>
                  </ul>
                </div>

                {/* Subsection 3 */}
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span className="p-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[10px]">3.3</span>
                    Financial Conversion & Tiers
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Earning clarity guarantees sustainable careers. Always align with the official agency payout structure.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Conversion rate is strictly 10,000 points = $1 USD.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Register for the weekly Talent Auction on your profile panel.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">✓</span>
                      Request official Livehouse event slots at least 48 hours prior.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">✗</span>
                      Never exchange account credentials or share stream payouts.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Tip Callout Box */}
              <div className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 flex items-start gap-3">
                <Award className="text-[#D4AF37] flex-shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Salary & Commissions Policy</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Host salaries are updated in the NINE Dashboard every Monday morning. Tiers are determined by your cumulative monthly point targets. Maintain your active hours (40 hours/month minimum) to remain eligible for commission overrides and performance bonuses.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE: FLIPPABLE FLASHCARDS ================= */}
      {activeMode === 'flashcards' && (
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Zap size={20} className="text-[#D4AF37]" />
              Flashcard Review
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Tap the card to flip it and reveal the answer. Use flashcard study to memorize key policies and techniques.
            </p>
          </div>

          {/* Flashcard 3D Render */}
          <div
            className="relative w-full max-w-lg h-72 cursor-pointer select-none"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className="w-full h-full relative"
              style={{
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s'
              }}
            >
              {/* Front Side */}
              <div
                className="absolute inset-0 w-full h-full rounded-2xl bg-[#21202B] border-2 border-[#D4AF37]/30 flex flex-col items-center justify-between p-6 text-center shadow-xl"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden'
                }}
              >
                <div className="flex justify-between w-full text-[10px] font-mono tracking-wider">
                  <span className="text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                    {flashcards[currentCardIdx].pillar}
                  </span>
                  <span className="text-slate-400 font-bold">
                    Card {currentCardIdx + 1} of {flashcards.length}
                  </span>
                </div>
                
                <p className="text-lg sm:text-xl font-bold text-white px-4 leading-relaxed">
                  {flashcards[currentCardIdx].question}
                </p>

                <div className="text-xs text-[#D4AF37] uppercase tracking-widest font-mono animate-pulse">
                  Click to Flip
                </div>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 w-full h-full rounded-2xl bg-slate-900 border-2 border-[#D4AF37]/65 flex flex-col items-center justify-between p-6 text-center shadow-xl"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div className="flex justify-between w-full text-[10px] font-mono tracking-wider">
                  <span className="text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                    ANSWER KEY
                  </span>
                  <span className="text-slate-400 font-bold">
                    Card {currentCardIdx + 1} of {flashcards.length}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-200 px-4 leading-relaxed font-sans">
                  {flashcards[currentCardIdx].answer}
                </p>

                <div className="text-xs text-[#D4AF37]/50 uppercase tracking-widest font-mono">
                  Click to flip back
                </div>
              </div>
            </div>
          </div>

          {/* Flashcard Stats & Actions */}
          <div className="w-full max-w-lg flex items-center justify-between gap-4 text-xs font-mono">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMastered(flashcards[currentCardIdx].id);
              }}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                masteredCards.includes(flashcards[currentCardIdx].id)
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
              }`}
            >
              {masteredCards.includes(flashcards[currentCardIdx].id) ? '✓ Mastered' : 'Mark as Mastered'}
            </button>

            <span className="text-slate-400">
              Mastered: {masteredCards.length} / {flashcards.length}
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-2 border border-white/5 rounded-xl">
            <button
              disabled={currentCardIdx === 0}
              onClick={() => {
                setCurrentCardIdx((prev) => prev - 1);
                setIsFlipped(false);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold font-mono px-3">
              {currentCardIdx + 1} / {flashcards.length}
            </span>
            <button
              disabled={currentCardIdx === flashcards.length - 1}
              onClick={() => {
                setCurrentCardIdx((prev) => prev + 1);
                setIsFlipped(false);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={20} />
            </button>

            <button
              onClick={() => {
                setCurrentCardIdx(0);
                setIsFlipped(false);
                setMasteredCards([]);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 transition-colors ml-2 border-l border-white/5 pl-4"
              title="Reset Cards"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODE: CERTIFICATION QUIZ ================= */}
      {activeMode === 'quiz' && (
        <div className="space-y-6">
          {!quizStarted && !quizFinished && (
            <div className="max-w-xl mx-auto text-center space-y-6 bg-[#21202B]/40 border border-[#D4AF37]/20 rounded-2xl p-8 shadow-2xl">
              <Trophy size={60} className="mx-auto text-[#D4AF37] animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                  Agency Certification Exam
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Test your host knowledge. This is a comprehensive 30-question assessment covering profile creation, operations, earnings, and engagement loops.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto bg-slate-900/60 p-4 border border-white/5 rounded-xl text-xs font-mono">
                <div>• Questions: <span className="font-bold text-white">30</span></div>
                <div>• Type: <span className="font-bold text-white">Multiple Choice</span></div>
                <div>• Pass Mark: <span className="font-bold text-[#D4AF37]">80% (24 Qs)</span></div>
                <div>• Review: <span className="font-bold text-white">Yes, at end</span></div>
              </div>

              <button
                onClick={restartQuiz}
                className="w-full max-w-xs inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#D4AF37] text-slate-950 font-black rounded-xl hover:bg-yellow-500 transition-all duration-150 shadow-lg shadow-[#D4AF37]/15"
              >
                Start Assessment
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {quizStarted && !quizFinished && (
            <div className="max-w-2xl mx-auto space-y-6 bg-[#21202B]/40 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* Quiz Progress Header */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#D4AF37] font-bold">
                    QUESTION {currentQuestionIdx + 1} OF {quizQuestions.length}
                  </span>
                  <span className="text-slate-400">
                    Current Score: {score} / {currentQuestionIdx + (isAnswered ? 1 : 0)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {quizQuestions[currentQuestionIdx].question}
              </h3>

              {/* Options list */}
              <div className="space-y-3">
                {quizQuestions[currentQuestionIdx].options.map((option, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrectAnswer = optIdx === quizQuestions[currentQuestionIdx].correctAnswer;
                  
                  let optionStyle = 'border-white/5 bg-slate-900/40 text-slate-300 hover:bg-slate-900/80 hover:text-white';
                  
                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      optionStyle = 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400';
                    } else if (isSelected) {
                      optionStyle = 'border-rose-500/50 bg-rose-500/15 text-rose-400';
                    } else {
                      optionStyle = 'border-white/5 bg-slate-900/20 text-slate-500 opacity-60 pointer-events-none';
                    }
                  }

                  return (
                    <button
                      key={option}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left text-xs sm:text-sm transition-all duration-150 ${optionStyle}`}
                    >
                      <span className="flex-1 pr-4 font-medium">{option}</span>
                      
                      {isAnswered && isCorrectAnswer && (
                        <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrectAnswer && (
                        <XCircle size={18} className="text-rose-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation Box */}
              {isAnswered && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono">
                    <Info size={14} className="text-[#D4AF37]" />
                    EXPLANATION
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {quizQuestions[currentQuestionIdx].explanation}
                  </p>
                </div>
              )}

              {/* Navigation Action */}
              {isAnswered && (
                <button
                  onClick={handleNextQuestion}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#D4AF37] text-slate-950 font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-lg"
                >
                  {currentQuestionIdx === quizQuestions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}

          {quizFinished && (
            <div className="max-w-2xl mx-auto space-y-6 bg-[#21202B]/40 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* Score Results Card */}
              <div className="text-center space-y-4">
                <Trophy size={50} className="mx-auto text-[#D4AF37]" />
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                    Exam Completed
                  </h3>
                  <p className="text-xs text-slate-400">
                    Here is your certification summary.
                  </p>
                </div>

                {/* Score Pie / Progress circle emulation */}
                <div className="py-6 flex flex-col items-center">
                  <div className="text-5xl font-black text-white flex items-baseline justify-center">
                    {score}
                    <span className="text-lg text-slate-400 font-medium">/ {quizQuestions.length}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#D4AF37] mt-2">
                    {((score / quizQuestions.length) * 100).toFixed(0)}% SCORE
                  </div>
                </div>

                {/* Pass/Fail Banner */}
                {score >= 24 ? (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 max-w-sm mx-auto text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Passed - Certified Host
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 max-w-sm mx-auto text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <XCircle size={16} />
                    Failed - Study and Retake
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setShowResultsReview(!showResultsReview)}
                  className="flex-1 py-3 bg-slate-900 border border-white/5 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors text-xs sm:text-sm"
                >
                  {showResultsReview ? 'Hide Mistakes Review' : 'Review Missed Questions'}
                </button>
                <button
                  onClick={restartQuiz}
                  className="flex-1 py-3 bg-[#D4AF37] text-slate-950 font-bold rounded-xl hover:bg-yellow-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Retake Exam
                </button>
              </div>

              {/* Mistakes review dropdown list */}
              {showResultsReview && (
                <div className="space-y-4 border-t border-white/5 pt-6 animate-fadeIn">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] font-mono">
                    Missed Questions Detail
                  </h4>

                  {userAnswers.filter((ua) => !ua.correct).length === 0 ? (
                    <p className="text-xs text-emerald-400 font-medium font-mono">
                      ✓ Flawless performance! No incorrect answers to review.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {userAnswers
                        .filter((ua) => !ua.correct)
                        .map((ua) => {
                          const q = quizQuestions[ua.questionIdx];
                          return (
                            <div
                              key={q.question}
                              className="p-4 rounded-xl bg-slate-900 border border-rose-500/20 space-y-2 text-xs"
                            >
                              <div className="font-bold text-slate-200">
                                Question {ua.questionIdx + 1}: {q.question}
                              </div>
                              <div className="text-rose-400 flex items-start gap-1">
                                <span className="font-semibold shrink-0">Your Answer:</span>
                                <span>{q.options[ua.selectedOption]}</span>
                              </div>
                              <div className="text-emerald-400 flex items-start gap-1">
                                <span className="font-semibold shrink-0">Correct Answer:</span>
                                <span>{q.options[q.correctAnswer]}</span>
                              </div>
                              <div className="text-slate-400 mt-2 text-[11px] leading-relaxed border-t border-white/5 pt-2 italic">
                                Note: {q.explanation}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Custom Helper Icons for Pillar Navigation
function ShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
