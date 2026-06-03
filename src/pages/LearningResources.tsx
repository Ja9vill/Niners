import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Trophy, Award, GraduationCap, Play, CheckCircle2, AlertTriangle, 
  Lightbulb, Calculator, HelpCircle, Edit3, Volume2, Video, Sun, Calendar, 
  Flame, MessageCircle, Heart, DollarSign, Target, Settings, Info, RefreshCw, 
  Copy, Check, Star, Sparkles, ChevronRight, User, Users, Shield, Zap, Upload, Clock, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Storage } from '../lib/storage';

// Types & interfaces
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  title: string;
  level: string;
  questions: QuizQuestion[];
}

export function LearningResources() {
  // Navigation & View settings
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pillars' | 'labs' | 'certifications' | 'ai-coach'>('dashboard');
  const [persona, setPersona] = useState<'host' | 'manager'>('host');
  const [selectedPillar, setSelectedPillar] = useState<number>(0);
  
  // Storage auth context
  const authState = Storage.getAuthState();
  
  // Automatically select persona based on user role
  useEffect(() => {
    const role = (authState.role || '').toLowerCase();
    if (role === 'manager' || role === 'agent' || role === 'director' || role === 'admin') {
      setPersona('manager');
    } else {
      setPersona('host');
    }
  }, [authState.role]);

  // Certifications / Quiz States
  const [selectedQuizLevel, setSelectedQuizLevel] = useState<string | null>(null);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResultsHistory, setQuizResultsHistory] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('nine_certification_status') || '{}');
    } catch {
      return {};
    }
  });

  // Certificate Viewer Modal
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);

  // Active Tool Lab States
  const [activeLabTool, setActiveLabTool] = useState<string>('photo-analyzer');

  // Cover Photo Analyzer States
  const [selectedPhotoTemplate, setSelectedPhotoTemplate] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoScore, setPhotoScore] = useState<any | null>(null);

  // Bio Builder States
  const [bioText, setBioText] = useState('');
  const [bioKeywords, setBioKeywords] = useState<string[]>(['Poppo Live', 'Talent', 'Singer', 'PK', 'Gamer', 'Chatting']);
  const [selectedBioKeywords, setSelectedBioKeywords] = useState<string[]>([]);
  const [bioTemplates, setBioTemplates] = useState([
    { name: 'Friendly Late-Night Chat', text: 'Hey guys! Welcome to my cozy late-night corner. I love sharing music, talking about life, and playing interactive PK games. Tune in for good vibes every night at 9 PM!' },
    { name: 'Talented Vocalist & Musician', text: '🎵 Singing live is my passion. Requests are always welcome! Host of daily themed rooms and music PK challenges. Join the fam and support the music journey!' },
    { name: 'Casual Gamer & PK Competitor', text: 'Gaming enthusiast & PK warrior! 🎮 Join me for live gaming drills, random PK battles, and community chats. Daily streams starting 4 PM EST.' }
  ]);

  // Name Readability States
  const [nametagText, setNametagText] = useState('');
  const [nametagResult, setNametagResult] = useState<any | null>(null);

  // Lighting Simulator States
  const [lightingPreset, setLightingPreset] = useState<'backlit' | 'overhead' | 'lowlight' | 'ringlight' | 'studio'>('overhead');

  // Visibility Budget States
  const [visibilityCoins, setVisibilityCoins] = useState(10000);
  const [visibilityPKs, setVisibilityPKs] = useState(3);
  const [visibilityBoxes, setVisibilityBoxes] = useState(1);
  const [calculatedVisibility, setCalculatedVisibility] = useState<any | null>(null);

  // No-Stream Generator States
  const [noStreamReason, setNoStreamReason] = useState<'sick' | 'family' | 'travel' | 'recharge'>('sick');
  const [noStreamDate, setNoStreamDate] = useState('');
  const [noStreamReturnDate, setNoStreamReturnDate] = useState('');
  const [generatedNoStreamText, setGeneratedNoStreamText] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Comment Speed Drill States
  const [drillActive, setDrillActive] = useState(false);
  const [drillComments, setDrillComments] = useState<Array<{ id: number; text: string; type: 'greeting' | 'question' | 'gift' | 'spam' }>>([]);
  const [drillScore, setDrillScore] = useState(0);
  const [drillMissed, setDrillMissed] = useState(0);
  const [drillStartTime, setDrillStartTime] = useState<number>(0);
  const [drillElapsed, setDrillElapsed] = useState(0);
  const [drillReactionTimes, setDrillReactionTimes] = useState<number[]>([]);

  // AI Coaching States
  const [aiFocus, setAiFocus] = useState<string>('retention');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);

  // Triggering photo analysis
  const runPhotoAnalysis = (templateId: string) => {
    setSelectedPhotoTemplate(templateId);
    setAnalyzingPhoto(true);
    setPhotoScore(null);
    setTimeout(() => {
      setAnalyzingPhoto(false);
      if (templateId === 'poor-selfie') {
        setPhotoScore({
          overall: 45,
          framing: 'Poor (Off-center, cropped head)',
          lighting: 'Harsh backlight, dark face shadow',
          haloEffect: 'Low trust engagement index',
          status: 'REJECTED',
          feedback: [
            'Avoid shooting with windows or bright lights behind you.',
            'Ensure your face occupies at least 50% of the cover frame.',
            'Use a soft frontal ring light to avoid dark facial shadows.'
          ]
        });
      } else if (templateId === 'group-photo') {
        setPhotoScore({
          overall: 55,
          framing: 'Crowded (Multiple subjects present)',
          lighting: 'Adequate, but lacks focus',
          haloEffect: 'Confusing brand presentation',
          status: 'REJECTED',
          feedback: [
            'A cover photo is your billboard. Viewers must know exactly who is broadcasting.',
            'Group photos dilute the Halo Effect. Keep it strictly solo.',
            'Use a clean, non-distracting background.'
          ]
        });
      } else {
        setPhotoScore({
          overall: 95,
          framing: 'Excellent (Rule of Thirds met, clear face visibility)',
          lighting: 'Balanced 3-point soft illumination',
          haloEffect: 'Strong cognitive fluency and premium look',
          status: 'APPROVED',
          feedback: [
            'Perfect frontal posture creating psychological eye contact.',
            'Excellent color contrast between subject and background.',
            'Meets all 4 non-negotiables of the Digital Handshake.'
          ]
        });
      }
    }, 1200);
  };

  // Naming standards evaluator
  const testNametag = (name: string) => {
    setNametagText(name);
    if (!name.trim()) {
      setNametagResult(null);
      return;
    }
    const hasEmojis = /[\uD800-\uDFFF\u2600-\u27BF]/.test(name);
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(name.replace(/[\uD800-\uDFFF\u2600-\u27BF]/g, ''));
    const isTooLong = name.length > 15;
    const isTooShort = name.length < 3;
    const hasNumbersOnly = /^\d+$/.test(name);

    let score = 100;
    const deductions = [];

    if (hasEmojis) {
      score -= 15;
      deductions.push('Contains symbols/emojis (Can reduce text-searchability and looks cluttered).');
    }
    if (hasSpecialChars) {
      score -= 20;
      deductions.push('Contains punctuation or complex characters (Hurts cognitive fluency).');
    }
    if (isTooLong) {
      score -= 25;
      deductions.push('Overly long (Hard for viewers to remember or call out in voice PKs).');
    }
    if (isTooShort) {
      score -= 15;
      deductions.push('Too short (Lacks unique brand identity).');
    }
    if (hasNumbersOnly) {
      score -= 30;
      deductions.push('Numeric only (Looks like default guest account, zero trust value).');
    }

    setNametagResult({
      score: Math.max(score, 10),
      cognitiveFluency: score >= 80 ? 'High' : score >= 50 ? 'Moderate' : 'Critical Hazard',
      recommendation: score >= 80 
        ? 'Excellent nametag! Easy to pronounce, search, and remember.' 
        : 'Optimize immediately: Remove special symbols, keep it simple (e.g. "EmmaLive" or "Luna_Music").'
    });
  };

  // Calculate Visibility
  useEffect(() => {
    const organicReachBase = 150;
    const boxBoost = visibilityBoxes * 450;
    const pkBoost = visibilityPKs * 250;
    const totalBoost = boxBoost + pkBoost;
    const reach = organicReachBase + totalBoost;
    const algorithmMultiplier = 1 + (visibilityBoxes * 0.5) + (visibilityPKs * 0.2);
    
    // Cost: Lucky Box (varies), PK is time/organic investment
    const spentCoins = (visibilityBoxes * 5000); 

    setCalculatedVisibility({
      boosterMultiplier: algorithmMultiplier.toFixed(1),
      estimatedReach: reach,
      roiScore: spentCoins > 0 ? ((reach / spentCoins) * 100).toFixed(0) : '100',
      optimalPKHours: '6 PM - 9 PM & 11 PM - 1 AM',
      assessment: totalBoost >= 1200 
        ? 'High algorithmic traction. Great budget for overcoming obscurity.' 
        : 'Moderate traction. Add at least 1 Lucky Box during peak hours to accelerate.'
    });
  }, [visibilityCoins, visibilityPKs, visibilityBoxes]);

  // Generate No-Stream Status Update
  useEffect(() => {
    const dateStr = noStreamDate ? new Date(noStreamDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'today';
    const returnStr = noStreamReturnDate ? new Date(noStreamReturnDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'our next scheduled slot';
    
    let text = '';
    switch (noStreamReason) {
      case 'sick':
        text = `🚨 STREAM UPDATE 🚨\n\nHey family! Unfortunately, I am feeling a bit under the weather today (${dateStr}) and need to rest my voice to make sure I can bring 100% energy to our streams. 🤒\n\nI will be taking the night off to recover and will see you all back on ${returnStr}! Thank you so much for understanding. Please stay safe and healthy! ❤️✨`;
        break;
      case 'family':
        text = `🚨 IMPORTANT NOTICE 🚨\n\nHello everyone! I have an urgent family commitment to attend to today (${dateStr}) and won't be able to go live. 🏠👨‍👩‍👧‍👦\n\nI hate missing our time together, but family comes first. I'll be back live on ${returnStr} and can't wait to catch up with all of you! Miss you guys already! 💖`;
        break;
      case 'travel':
        text = `✈️ TRAVEL ANNOUNCEMENT ✈️\n\nHey tribe! Just a heads up that I am traveling today (${dateStr}) and will have limited network signal. As a result, today's stream is cancelled. 🗺️\n\nI will keep you updated in the group chat and will return live on ${returnStr} with lots of stories to share! Have a wonderful day! 🌟`;
        break;
      case 'recharge':
        text = `🔋 BATTERY RECHARGE DAY 🔋\n\nHey lovely team! To keep our stream quality high and avoid burnout, I am taking a scheduled creative recharge day today (${dateStr}). 🧘‍♀️✨\n\nTaking care of mental health is what keeps us consistent in the long run! I'll be active in our Discord/Group Chats and will return live on ${returnStr} stronger than ever. Thank you for your endless love! 💎`;
        break;
    }
    setGeneratedNoStreamText(text);
  }, [noStreamReason, noStreamDate, noStreamReturnDate]);

  // Copy Status Update Helper
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedNoStreamText);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  // Comments speed test drill logic
  const handleStartDrill = () => {
    setDrillActive(true);
    setDrillScore(0);
    setDrillMissed(0);
    setDrillStartTime(Date.now());
    setDrillReactionTimes([]);
    
    // Spawn first wave
    const initialComments = [
      { id: 1, text: 'Hello host! Cute outfit!', type: 'greeting' as const },
      { id: 2, text: 'How long have you been streaming?', type: 'question' as const },
      { id: 3, text: 'Sent you a Lucky Clover! 🍀', type: 'gift' as const }
    ];
    setDrillComments(initialComments);
  };

  const handleRespondToComment = (id: number, type: 'greeting' | 'question' | 'gift' | 'spam') => {
    const target = drillComments.find(c => c.id === id);
    if (!target) return;

    if (target.type === type) {
      setDrillScore(prev => prev + 1);
      const reactionTime = (Date.now() - drillStartTime) / 1000;
      setDrillReactionTimes(prev => [...prev, reactionTime]);
    } else {
      setDrillMissed(prev => prev + 1);
    }
    
    // Remove and spawn replacement
    setDrillComments(prev => {
      const filtered = prev.filter(c => c.id !== id);
      const pool = [
        { text: 'Is this your full time job?', type: 'question' as const },
        { text: 'Nice song, can you sing next?', type: 'question' as const },
        { text: 'WELCOME TO THE STREAM!', type: 'greeting' as const },
        { text: 'Sent a Fireworks! 🎆', type: 'gift' as const },
        { text: 'Join my agency discount links fast!', type: 'spam' as const },
        { text: 'Wow, love the background!', type: 'greeting' as const }
      ];
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      return [...filtered, { id: Date.now(), ...randomItem }];
    });
  };

  // Timer loop for Comment Speed Drill
  useEffect(() => {
    let interval: any;
    if (drillActive) {
      interval = setInterval(() => {
        setDrillElapsed(prev => {
          if (prev >= 20) {
            setDrillActive(false);
            clearInterval(interval);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [drillActive]);

  // AI Coaching Engine Plan Generator
  const generateAiPlan = () => {
    setGeneratingPlan(true);
    setGeneratedPlan(null);
    setTimeout(() => {
      setGeneratingPlan(false);
      if (aiFocus === 'retention') {
        setGeneratedPlan({
          title: 'Emotional Continuity & Ritual Optimization Plan',
          metrics: { current: '2.4 min average watch duration', target: '5.0 min average watch duration' },
          actionSteps: [
            { title: 'The First-Minute Anchor', desc: 'When a new viewer joins, greeting them by name is not enough. Relate their username to an open-ended greeting e.g., "Welcome @StarryNight, are you stargazing tonight or working late?"' },
            { title: 'Implement a 30-Min Micro-Ritual', desc: 'Establish a scheduled event every 30 minutes. E.g., "The Gratitude Circle" where you play a dedicated theme song and thank the top 3 contributors of the last half hour.' },
            { title: 'Group Chat (GC) Continuity', desc: 'Post a "Highlight Reel" summary with screenshots in your Poppo community group chat within 30 minutes of ending your stream.' }
          ],
          scripts: [
            { situation: 'Viewer enters and stays silent for 60s', quote: '"Hey [Name]! I see you hanging out in the cozy corner. I was just talking about my favorite childhood comfort foods. What is one food that instantly makes your day better?"' }
          ]
        });
      } else if (aiFocus === 'monetization') {
        setGeneratedPlan({
          title: 'Ethical Coin Goal Framing & Gratitude System',
          metrics: { current: '15,000 points/hr average', target: '50,000 points/hr average' },
          actionSteps: [
            { title: 'Goal Arch Framing', desc: 'Never show a flat goal widget. Align your goal with a shared mission. E.g. "Upgrading my audio microphone so your song requests sound studio-quality!"' },
            { title: 'The 3-Step Gratitude Loop', desc: 'Step 1: Express shock and emotion. Step 2: Play the donor’s signature sound effect. Step 3: Write their name on your background whiteboard.' },
            { title: 'Co-Host Random PK Framing', desc: 'Invite viewers to defend the board. Say: "We are at 9,000 points. Can we hit 10k to unlock the double booster?"' }
          ],
          scripts: [
            { situation: 'Setting a daily goal on stream', quote: '"Team, today our mission is to reach 20k points to claim the platform bonus ranking. This will push us into the top trending recommendations, putting our family on the billboard!"' }
          ]
        });
      } else {
        setGeneratedPlan({
          title: 'Algorithmic Visibility Boost & PK Domination Plan',
          metrics: { current: 'Ranked in bottom 50%', target: 'Top 15% trending visibility' },
          actionSteps: [
            { title: 'Lucky Box Synchronization', desc: 'Deploy 1 Lucky Box exactly 2 minutes before launching a Random PK. This draws passive clickers into the room to inflate viewer volume exactly when the PK starts.' },
            { title: 'Co-Host PK Warmup', desc: 'Spend the first 5 minutes of your stream on profile engagement. Then run 3 consecutive PKs. The algorithm favors rapid engagement spikes early in the session.' },
            { title: 'Peak Hour Matching', desc: 'Align visibility budgets strictly with hours 18:00 - 21:00 or 23:00 - 01:00. Streaming off-peak wastes Lucky Box visibility boosts.' }
          ],
          scripts: [
            { situation: 'Deploying a Lucky Box', quote: '"Lucky Box is dropping in 1 minute, family! Click the chest, get your coins, and get ready to drop them in the upcoming PK battle to defend our spot!"' }
          ]
        });
      }
    }, 1500);
  };

  // Quizzes list data
  const quizzes: Quiz[] = [
    {
      level: 'beginner',
      title: 'Beginner Certification Quiz',
      questions: [
        {
          question: 'What is the "Digital Handshake" goal in Profile Optimization?',
          options: [
            'Make viewers support you with coins.',
            'Build trust and interest in under 3 seconds.',
            'Convince a manager to sign your contract.',
            'Create a group chat with 100 members.'
          ],
          correctAnswer: 1,
          explanation: 'Profile Optimization acts as your digital billboard. The visual elements must establish cognitive fluency and trust within 3 seconds.'
        },
        {
          question: 'Which of the following is considered the #1 hardware priority for psychological comfort?',
          options: [
            'Expensive video editing software.',
            'A high-end ring light.',
            'Audio quality (Microphone/clarity).',
            'A DSLR camera setup.'
          ],
          correctAnswer: 2,
          explanation: 'Audio quality is #1. Viewers will tolerate average video, but bad, noisy, or distorted audio will drive them away instantly.'
        },
        {
          question: 'What does "Nametag Cognitive Fluency" mean?',
          options: [
            'Having as many emojis and special characters as possible.',
            'A name that is simple, pronounceable, search-friendly, and memorable.',
            'A name that only has numbers to protect privacy.',
            'Translating your name into multiple languages.'
          ],
          correctAnswer: 1,
          explanation: 'Nametags should avoid complex punctuation, symbols, and random numbers so that they are highly readable and easy to call out.'
        }
      ]
    },
    {
      level: 'intermediate',
      title: 'Intermediate Certification Quiz',
      questions: [
        {
          question: 'How should you schedule updates when you cannot stream due to an emergency?',
          options: [
            'Say nothing and hope they do not notice.',
            'Post a detailed "No-Stream Announcement" in community chats at least 2 hours before the scheduled slot.',
            'Text your manager to stream for you.',
            'Go live for 2 seconds and turn off the phone.'
          ],
          correctAnswer: 1,
          explanation: 'Consistency builds habit and loyalty. If an emergency arises, write an update containing the date of absence, reason, and return date.'
        },
        {
          question: 'What is the algorithmic purpose of combining Lucky Boxes and Random PKs?',
          options: [
            'To spend as many coins as possible.',
            'To draw in crowd traffic to spike room metrics exactly when the PK engagement boosts are active.',
            'To get coins back from the platform.',
            'To bypass security filters.'
          ],
          correctAnswer: 1,
          explanation: 'Lucky Boxes draw in audience traffic, which spikes active room counts. Conducting a PK during this period maximizes algorithmic visibility.'
        },
        {
          question: 'How do you prevent "Dead Air" in interaction?',
          options: [
            'By remaining silent when nobody is chatting.',
            'By playing music at max volume to drown out silence.',
            'By speaking continuously, telling stories, asking open-ended questions, and keeping energy up even if the chat is quiet.',
            'By turning off the stream.'
          ],
          correctAnswer: 2,
          explanation: 'Dead air kills viewer retention. Dynamic hosts maintain a continuous flow of commentary, reading names, and asking questions.'
        }
      ]
    },
    {
      level: 'advanced',
      title: 'Advanced Certification Quiz',
      questions: [
        {
          question: 'What is the viewer retention funnel order?',
          options: [
            'Follow CTA → Fanclub CTA → Group Chat Retention → Milestone Celebrations.',
            'Coin donation → Follow → Private Message → Exit.',
            'Fanclub → Roster → Admin upgrade → Agency sign.',
            'There is no funnel in streaming.'
          ],
          correctAnswer: 0,
          explanation: 'A structured retention path moves a viewer from clicking Follow, subscribing to the Fanclub, joining community Group Chats, and participating in Milestones.'
        },
        {
          question: 'Which goal setting principle represents the "Four Goal Arches"?',
          options: [
            'Stream time, follower count, gifts received, and PK wins.',
            'Earnings/Coins, Community Growth, Talent Development, and Technical Quality.',
            'Sleeping, eating, streaming, and relaxing.',
            'Weekly, monthly, quarterly, and yearly metrics.'
          ],
          correctAnswer: 1,
          explanation: 'A host must balance their routine across all four pillars: Financial (Earnings), Audience (Community), Skill (Talent), and Infrastructure (Quality).'
        },
        {
          question: 'How does the principle of Reciprocity apply to monetization?',
          options: [
            'Demanding that viewers pay for your time.',
            'Creating mutual value: providing emotional support, high entertainment, and celebrating their presence prior to asking for goals.',
            'Offering free cash giveaways to top gifters.',
            'Ignoring small gifters and focusing only on whales.'
          ],
          correctAnswer: 1,
          explanation: 'Reciprocity triggers generosity naturally when viewers feel valued, heard, and emotionally connected to the host and community.'
        }
      ]
    },
    {
      level: 'pro',
      title: 'Pro Master Final Certification Quiz',
      questions: [
        {
          question: 'How should a manager handle a host with poor background and bad lighting?',
          options: [
            'Nuke their account immediately.',
            'Conduct a Quality Audit, fill the Live Quality Scorecard, and coach them through a 3-point light setup.',
            'Ignore it as long as they generate points.',
            'Stream for them to show them how it is done.'
          ],
          correctAnswer: 1,
          explanation: 'Managers are coaches. They enforce standards by auditing background noise, lighting, and placement, providing clear actionable plans.'
        },
        {
          question: 'What is a "Gratitude Loop" in Monetization Coaching?',
          options: [
            'A repetitive thank-you script.',
            'A systematic 3-step response (emotion, sound cue, naming/whiteboard writing) that validates donor support.',
            'Giving coins back to the donor.',
            'Banning people who do not donate.'
          ],
          correctAnswer: 1,
          explanation: 'A loop turns single-time donations into recurring support by rewarding the donor with intense emotional validation and community prestige.'
        },
        {
          question: 'What is the primary objective of the Review & Examination Platform?',
          options: [
            'To test internet connections.',
            'To serve as the master knowledge base for AI coaching, trend detection, and skill evaluation.',
            'To rank agencies on the global leaderboards.',
            'To store password archives.'
          ],
          correctAnswer: 1,
          explanation: 'The training framework is the single source of truth for the AI coaching engine to diagnose and generate personalized recommendations.'
        }
      ]
    }
  ];

  const handleStartQuiz = (level: string) => {
    setSelectedQuizLevel(level);
    setCurrentQuizQuestionIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleSelectOption = (idx: number) => {
    setSelectedOption(idx);
  };

  const handleNextQuestion = (correctAnswerIndex: number) => {
    if (selectedOption === correctAnswerIndex) {
      setQuizScore(prev => prev + 1);
    }
    
    const quiz = quizzes.find(q => q.level === selectedQuizLevel);
    if (!quiz) return;

    if (currentQuizQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuizQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // Calculate final score
      const finalScore = selectedOption === correctAnswerIndex ? quizScore + 1 : quizScore;
      const totalQ = quiz.questions.length;
      
      if (finalScore === totalQ) {
        // Passed!
        const updated = { ...quizResultsHistory, [selectedQuizLevel]: true };
        setQuizResultsHistory(updated);
        localStorage.setItem('nine_certification_status', JSON.stringify(updated));
      }
      setQuizFinished(true);
    }
  };

  // 9 Pillars Data
  const pillars = [
    {
      id: 1,
      title: 'Profile Optimization',
      sub: 'Digital Handshake',
      goal: 'Build trust in 3 seconds.',
      learn: [
        'Live cover photo = billboard. Clean, centered, professional.',
        'Profile photo = Halo Effect. Warm smile, high trust indicators.',
        'Nametag = cognitive fluency. Simple pronunciation, easy to memorize.',
        'Bio = elevator pitch. Express what viewers get in 3 sentences.'
      ],
      why: 'Viewers scrolling through recommendations select channels on instant visual appeal. A poor layout makes you invisible to high-value traffic.',
      tools: ['Cover Photo Analyzer', 'Bio Builder', 'Name Readability Test'],
      drills: [
        'Upload 3 cover options and run through critical checklist voting.',
        'Rewrite bio under a 60-second timer restriction.',
        'Perform the "Would You Click?" thumb-stop scroll test.'
      ],
      assessment: 'Profile must pass all 4 non-negotiables: High-res solo cover, name readability score > 80, no generic bio, and optimized searchability.',
      managerRoles: {
        audit: 'Audit host profile cover images weekly. Flag group photos, dark lighting, or low-resolution selfies.',
        coach: 'Provide custom copy suggestions for bios and suggest typography styles for nametags.',
        enforce: 'Ensure no host streams with placeholder, default, or platform-banned images.',
        tools: ['Profile Audit Checklist']
      }
    },
    {
      id: 2,
      title: 'Live Quality',
      sub: 'Psychological Comfort',
      goal: 'Make viewers feel safe, comfortable, and willing to stay.',
      learn: [
        'Audio is #1 priority. Echo, hiss, or distortion drives traffic away.',
        'Lighting = trust. Face must be softly lit with frontal exposure.',
        'Background = cognitive load. Keep it clutter-free, tidy, or themed.',
        'Device placement = eye contact. Lens at eye level to form connection.'
      ],
      why: 'Technical friction creates subconscious discomfort. High-quality production retains sophisticated viewers who support financially.',
      tools: ['Audio Test Lab', 'Lighting Simulator', 'Background Cleanliness Score'],
      drills: [
        'Conduct a 30-second silent audio room sweep checking for fans or echo.',
        'Play the "Spot the Distraction" background grid test.',
        'Perform 2 minutes of direct lens eye-contact exercises.'
      ],
      assessment: '1-minute mock stream audit: Voice must be crystal clear, face fully visible without shadows, lens aligned, background tidy.',
      managerRoles: {
        audit: 'Check live houses and rooms during broadcasts to score ambient sound levels and echo.',
        coach: 'Teach 3-point lighting setups (key, fill, background backlight) using affordable home equipment.',
        enforce: 'Mandate headset or dedicated microphone usage for hosts with poor device audio.',
        tools: ['Live Quality Scorecard']
      }
    },
    {
      id: 3,
      title: 'Timing & Consistency',
      sub: 'Engine of Loyalty',
      goal: 'Build habit, trust, and reliability.',
      learn: [
        'Consistency beats talent. Establishing a rigid schedule creates user habits.',
        'Habit formation. Viewers check in during specific routines.',
        'Pre-stream announcements. Warm up the chat group before going live.',
        'No-stream updates. Never disappear without warning.'
      ],
      why: 'Unpredictable streaming schedules signal lack of professionalism, damaging trust with regular donors who build their calendars around you.',
      tools: ['Schedule Builder', 'Consistency Tracker', 'No-Stream Update Generator'],
      drills: [
        'Draft 3 different pre-stream countdown updates.',
        'Map out a 3-month consistency routine with scheduled breaks.',
        'Practice formatting and copying an emergency absence post.'
      ],
      assessment: 'Maintain perfect attendance of scheduled hours for a continuous 2-week period.',
      managerRoles: {
        audit: 'Track host start/end timestamps via platform logs to verify schedule drift.',
        coach: 'Help hosts optimize schedules based on peak global traffic timezones.',
        enforce: 'Enforce mandatory pre-announcements and review host notifications for absences.',
        tools: ['Attendance Dashboard']
      }
    },
    {
      id: 4,
      title: 'Visibility Investment',
      sub: 'Overcoming Obscurity',
      goal: 'Break through the initial invisibility phase.',
      learn: [
        'Lucky Box = targeted advertisement. Drops draw traffic to boost metrics.',
        'Random PK = algorithmic accelerator. Boosts discoverability.',
        'Visibility budget allocation. Spend coins to make coins.'
      ],
      why: 'Relying solely on organic discovery is extremely slow. Using tools like Lucky Boxes draws high-volume traffic to kickstart active algorithms.',
      tools: ['Visibility Budget Calculator', 'PK Strategy Simulator', 'Lucky Box Timing Planner'],
      drills: [
        'Run 3 consecutive PK matches back-to-back.',
        'Calculate ROI on a 5,000 Coin box visibility drop.',
        'Identify peak traffic hours by matching regional recommendation grids.'
      ],
      assessment: 'Submit a detailed 30-day visibility budget plan outlining PK targets and box schedules.',
      managerRoles: {
        audit: 'Review visibility cost spreadsheets to analyze user coin ROI.',
        coach: 'Advise on optimal timing for box drops during critical PK tiebreakers.',
        enforce: 'Enforce correct host PK behavior, ensuring matches are handled with high energy.',
        tools: ['Visibility Planner']
      }
    },
    {
      id: 5,
      title: 'In-Stream Interaction',
      sub: 'Engagement Engine',
      goal: 'Turn passive viewers into active community participants.',
      learn: [
        'The Reciprocity dynamic: Validate actions to encourage engagement.',
        'Open-ended questions. Avoid yes/no inquiries to stimulate active chat.',
        'Eliminating dead air. Keep talking to form connection.'
      ],
      why: 'Silent or non-responsive hosts feel cold and boring. Prompt interactive validation keeps users feeling seen and appreciated.',
      tools: ['Comment Response Speed Test', 'Open-Ended Question Generator', 'Dead-Air Alarm'],
      drills: [
        'Conduct a 5-minute nonstop vocal monologue talking about comments.',
        'Draft personalized unique greetings for 5 mock usernames.',
        'Perform storytelling warm-up drills without pauses.'
      ],
      assessment: 'Successfully complete a 3-minute interaction review with zero gaps in commentary.',
      managerRoles: {
        audit: 'Monitor stream chats to measure average host response times.',
        coach: 'Train hosts on verbal storytelling, inflection, and humor.',
        enforce: 'Intervene if a host is seen ignoring active chat questions or looking away from the camera.',
        tools: ['Interaction Evaluation Form']
      }
    },
    {
      id: 6,
      title: 'Fanbase Development',
      sub: 'Architecting Your Tribe',
      goal: 'Convert general viewers into loyal, committed community members.',
      learn: [
        'The viewer conversion funnel: Visitor → Follower → Fanclub → VIP.',
        'Deliver strong Follow Call-To-Actions (CTAs) naturally.',
        'Framing Fanclub rewards and prestige elements.',
        'Symbolic language and custom tribe identities.'
      ],
      why: 'Gifting is a community act. Viewers support hosts because they want to belong to a family. Building a tribe name and symbols fosters identity.',
      tools: ['CTA Delivery Coach', 'Community Identity Builder', 'Fanclub Welcome Script Generator'],
      drills: [
        'Deliver 3 distinct call-to-actions within a 1-minute period.',
        'Invent a unique tribe name, matching emojis, and welcome slogans.',
        'Practice a high-energy celebratory greeting for a new Fanclub member.'
      ],
      assessment: 'Grow active Fanclub count by 15% during a weekly funnel challenge.',
      managerRoles: {
        audit: 'Review weekly fanclub retention rates and growth charts.',
        coach: 'Help hosts design custom badges, perks, and Discord ranks.',
        enforce: 'Ensure the host regularly mentions and celebrates their fanclub goals on stream.',
        tools: ['Fanbase Growth Tracker']
      }
    },
    {
      id: 7,
      title: 'Retention',
      sub: 'Maintaining Loyalty',
      goal: 'Keep viewers coming back consistently.',
      learn: [
        'Emotional continuity: Maintaining connections outside the live hours.',
        'Leveraging Group Chats (GC) for daily updates and relationship building.',
        'Creating scheduled weekly stream rituals and traditions.'
      ],
      why: 'It is 5x cheaper to keep an existing viewer than to find a new one. Loyalty is maintained through emotional check-ins between broadcasts.',
      tools: ['GC Update Writer', 'Retention Calendar', 'Milestone Tracker'],
      drills: [
        'Write 3 engaging, interactive offline group chat updates.',
        'Create a blueprint for a weekly community ritual (e.g., Sunday Requests).',
        'Map out a milestone celebration (e.g. 50k points, 6-month anniversary).'
      ],
      assessment: 'Submit a comprehensive 3-month retention calendar containing weekly rituals and milestones.',
      managerRoles: {
        audit: 'Monitor offline group chat engagement and check for spam or inactive periods.',
        coach: 'Guide hosts in managing difficult community dynamics or burnouts.',
        enforce: 'Ensure host posts at least one community check-in every 24 hours.',
        tools: ['Retention Dashboard']
      }
    },
    {
      id: 8,
      title: 'Monetization',
      sub: 'Activating Financial Support',
      goal: 'Inspire donor generosity ethically and sustainably.',
      learn: [
        'Leveraging reciprocity and emotional resonance.',
        'Framing coin goals as shared team milestones, not personal greed.',
        'Structuring high-energy PK monetization moments.'
      ],
      why: 'Viewers gift to feel helpful and to share in accomplishment. Pressuring users leads to guilt and departures; framing goals as a shared mission inspires support.',
      tools: ['Coin Goal Framing Coach', 'Emotional Moment Builder', 'PK Monetization Simulator'],
      drills: [
        'Practice a 3-step high-energy gratitude loop.',
        'Frame 3 stream goals (e.g., microphone upgrade) into community missions.',
        'Construct a 30-second monetization peak build-up script.'
      ],
      assessment: 'Pass a simulated monetization scenario test, demonstrating ethical framing and positive loops.',
      managerRoles: {
        audit: 'Analyze coin earnings breakdowns to check for donor concentration risk.',
        coach: 'Train hosts on the psychology of appreciation and celebration loops.',
        enforce: 'Ensure no host uses begging, guilt-tripping, or manipulative tactics on stream.',
        tools: ['Monetization Analysis Tool']
      }
    },
    {
      id: 9,
      title: 'Intentional Goal Setting',
      sub: 'Guiding Principle',
      goal: 'Never stream without purpose.',
      learn: [
        'The Four Goal Arches: Financial, Community, Skill, and Quality.',
        'The Declare → Track → Review feedback loops.',
        'Creating structured pre-stream routines.'
      ],
      why: 'Streaming without clear daily targets leads to sluggish pacing, low motivation, and boring broadcasts. Declaring goals keeps you and your chat aligned.',
      tools: ['Goal Arch Selector', 'Stream Routine Coach', 'Goal Tracking Dashboard'],
      drills: [
        'Declare 3 specific, measurable goals before a mock live session.',
        'Practice a mid-stream verbal goal check-in.',
        'Write a 3-sentence post-stream review detailing outcomes.'
      ],
      assessment: 'Submit a complete stream "Flight Plan" layout outlining targets for the next 4 weeks.',
      managerRoles: {
        audit: 'Review and approve host weekly goals and alignment plans.',
        coach: 'Help hosts conduct post-stream diagnostic reviews when goals are missed.',
        enforce: 'Ensure hosts maintain a visible goal widget on screen at all times.',
        tools: ['Goal Arch Dashboard']
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#13131E] p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#D4AF37]/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-radial from-[#8b5cf6]/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              <GraduationCap size={13} className="animate-pulse" />
              Poppo Live Training Academy
            </div>
            <h1 className="text-3xl font-black text-white tracking-wide font-['Outfit']">LEARNING RESOURCES</h1>
            <p className="text-sm text-[#A09E9A] max-w-2xl leading-relaxed">
              The master knowledge base and training framework built from the Nine Pillars of Success, Creator's Playbook, Monetization Strategies, and Viewer Psychology.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'dashboard'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('pillars')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'pillars'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              9 Pillars Curriculum
            </button>
            <button
              onClick={() => setActiveTab('labs')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'labs'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              Practice Labs
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'certifications'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              Certifications
            </button>
            <button
              onClick={() => setActiveTab('ai-coach')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'ai-coach'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              AI Recommendation
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {/* ==================== TAB: OVERVIEW DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Progress Card */}
              <div className="glass-card flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-widest mb-1">Your Progress</h2>
                  <p className="text-xs text-[#A09E9A]">Track your path toward Pro Live Certification.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-[#A09E9A]">Completed Modules</span>
                      <span className="text-[#D4AF37]">4 of 9</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E8C44A]" style={{ width: '44%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-[#A09E9A]">Drill Drills Logged</span>
                      <span className="text-cyan-400">8 drills</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">UNLOCKED CERTIFICATES</span>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                      <Trophy size={16} className="text-[#D4AF37]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">Beginner Cert</p>
                        <p className="text-[9px] text-[#A09E9A]">Unlocked 2 days ago</p>
                      </div>
                      <button 
                        onClick={() => setViewingCertificate('beginner')}
                        className="text-[10px] font-bold text-[#D4AF37] hover:underline shrink-0"
                      >
                        View
                      </button>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 opacity-50">
                      <Trophy size={16} className="text-[#A09E9A]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">Intermediate Cert</p>
                        <p className="text-[9px] text-[#A09E9A]">Locked (Take Quiz)</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('certifications')}
                        className="text-[10px] font-bold text-[#A09E9A] hover:text-[#F0EFE8] shrink-0"
                      >
                        Unlock
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-auto bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#D4AF37]" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">AI Coach Alert</span>
                  </div>
                  <p className="text-xs text-[#A09E9A] leading-relaxed">
                    "Your lighting score dropped below standard during yesterday's stream. Try running the Lighting Simulator in Practice Labs."
                  </p>
                  <button
                    onClick={() => { setActiveTab('labs'); setActiveLabTool('lighting'); }}
                    className="btn-gold py-1.5 w-full text-center text-xs"
                  >
                    Open Simulator
                  </button>
                </div>
              </div>

              {/* Right Columns: Core Structure overview */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Curriculum Path Cards */}
                <div className="glass-card">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Training Structure</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 hover:border-[#D4AF37]/30 transition-all flex gap-3 group cursor-pointer"
                      onClick={() => { setActiveTab('pillars'); setPersona('host'); }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0">
                        <User size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#D4AF37] transition-colors">1. Host training (9 Pillars)</h4>
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Step-by-step skill development for Poppo Live hosts covering cover optimization, timing, PK budget, and goal tracking.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 hover:border-[#D4AF37]/30 transition-all flex gap-3 group cursor-pointer"
                      onClick={() => { setActiveTab('pillars'); setPersona('manager'); }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors">2. Manager training</h4>
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Parallel leadership paths instructing agents how to audit, evaluate, coordinate schedules, and build host monetization.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 hover:border-[#D4AF37]/30 transition-all flex gap-3 group cursor-pointer"
                      onClick={() => setActiveTab('labs')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <Calculator size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors">3. Interactive Practice Labs</h4>
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Playable simulators: Bio Builder, Camera Light controller, and the speed response game to hone timing drills.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 hover:border-[#D4AF37]/30 transition-all flex gap-3 group cursor-pointer"
                      onClick={() => setActiveTab('certifications')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Award size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors">4. Certification Path</h4>
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Prove streaming mastery from Beginner level through Pro certification. Qualifies hosts for priority agency spotlight.</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* AI recommendations widget */}
                <div className="glass-card flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-radial from-[#D4AF37]/10 to-transparent blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-[#D4AF37] animate-pulse" size={20} />
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Coaching Engine</h3>
                      <p className="text-[10px] text-[#A09E9A]">Single source of truth for customized recommendations</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#A09E9A] leading-relaxed">
                    Our AI models parse these training resources alongside performance databases to draft custom action plans, PK timing templates, monetization moments, and fanbase conversion tricks.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('ai-coach')} 
                      className="btn-gold text-[10px] px-4 py-2"
                    >
                      Request Consultation Plan
                    </button>
                    <button 
                      onClick={() => setActiveTab('pillars')}
                      className="px-3 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-white transition-all"
                    >
                      Review 9 Pillars
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: 9 PILLARS CURRICULUM ==================== */}
          {activeTab === 'pillars' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Pillar Selector Sidebar */}
              <div className="glass-card flex flex-col gap-4 h-fit">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Curriculum Path</span>
                  <div className="flex items-center gap-1 bg-[#0D0D14] border border-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setPersona('host')}
                      className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all ${
                        persona === 'host' ? 'bg-[#D4AF37] text-[#0D0D14]' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                      }`}
                    >
                      Host
                    </button>
                    <button
                      onClick={() => setPersona('manager')}
                      className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all ${
                        persona === 'manager' ? 'bg-purple-600 text-white' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                      }`}
                    >
                      Manager
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {pillars.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPillar(idx)}
                      className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 ${
                        selectedPillar === idx
                          ? persona === 'host'
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37]/45 text-[#D4AF37]'
                            : 'bg-purple-600/15 border-purple-500/45 text-purple-400'
                          : 'bg-white/02 border-transparent text-[#A09E9A] hover:bg-white/05 hover:text-[#F0EFE8]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        selectedPillar === idx
                          ? persona === 'host'
                            ? 'bg-[#D4AF37] text-[#0D0D14]'
                            : 'bg-purple-600 text-white'
                          : 'bg-white/5 text-[#A09E9A]'
                      }`}>
                        {p.id}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{p.title}</p>
                        <p className="text-[9px] text-[#A09E9A]/60 truncate mt-0.5">{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pillar Detailed View */}
              <div className="lg:col-span-3 glass-card flex flex-col gap-6 relative overflow-hidden">
                {/* Decorative theme color splash */}
                <div className={`absolute top-0 right-0 w-80 h-80 bg-radial ${
                  persona === 'host' ? 'from-[#D4AF37]/5' : 'from-purple-500/5'
                } to-transparent blur-3xl pointer-events-none`} />

                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-white/5 pb-4 relative z-10">
                  <div className="space-y-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      persona === 'host' ? 'text-[#D4AF37]' : 'text-purple-400'
                    }`}>
                      {persona === 'host' ? 'Host Pillar' : 'Manager Coaching Path'} {pillars[selectedPillar].id}
                    </p>
                    <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-wide uppercase">
                      {pillars[selectedPillar].title}
                    </h2>
                    <p className="text-xs text-[#A09E9A] italic">"{pillars[selectedPillar].sub}"</p>
                  </div>

                  <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border ${
                    persona === 'host' 
                      ? 'border-[#D4AF37]/20 bg-[#D4AF37]/5 text-[#D4AF37]' 
                      : 'border-purple-500/20 bg-purple-500/5 text-purple-400'
                  }`}>
                    <Target size={14} />
                    <span>Goal: {pillars[selectedPillar].goal}</span>
                  </div>
                </div>

                {persona === 'host' ? (
                  /* ================= HOST PATH DETAIL ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={14} className="text-[#D4AF37]" />
                          What Hosts Must Learn
                        </h3>
                        <ul className="space-y-1.5">
                          {pillars[selectedPillar].learn.map((item, idx) => (
                            <li key={idx} className="text-xs text-[#A09E9A] flex gap-2 items-start leading-relaxed">
                              <span className="text-[#D4AF37] font-bold mt-0.5">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-cyan-400" />
                          Why It Matters
                        </h3>
                        <p className="text-xs text-[#A09E9A] leading-relaxed bg-[#0D0D14] p-3 rounded-xl border border-white/5">
                          {pillars[selectedPillar].why}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Settings size={14} className="text-purple-400" />
                          Interactive Tools Included
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {pillars[selectedPillar].tools.map((t, idx) => (
                            <span 
                              key={idx} 
                              onClick={() => {
                                setActiveTab('labs');
                                // Map string names to the key identifiers
                                const lower = t.toLowerCase();
                                if (lower.includes('photo')) setActiveLabTool('photo-analyzer');
                                else if (lower.includes('bio')) setActiveLabTool('bio-builder');
                                else if (lower.includes('readability')) setActiveLabTool('name-readability');
                                else if (lower.includes('light')) setActiveLabTool('lighting');
                                else if (lower.includes('budget')) setActiveLabTool('visibility-budget');
                                else if (lower.includes('update')) setActiveLabTool('no-stream-generator');
                                else if (lower.includes('speed') || lower.includes('comment')) setActiveLabTool('comment-drill');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-[#D4AF37]/40 text-[10px] font-bold text-white transition-all cursor-pointer"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-500 font-bold" />
                          Host Drills
                        </h3>
                        <ul className="space-y-1.5">
                          {pillars[selectedPillar].drills.map((drill, idx) => (
                            <li key={idx} className="text-xs text-[#A09E9A] flex gap-2 items-start leading-relaxed">
                              <input type="checkbox" className="mt-1 accent-[#D4AF37] cursor-pointer" />
                              <span>{drill}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Award size={14} className="text-emerald-400" />
                          Official Assessment
                        </h3>
                        <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-emerald-500 pl-3">
                          {pillars[selectedPillar].assessment}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= MANAGER PATH DETAIL ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Shield size={14} className="text-purple-400" />
                          What Managers Evaluate
                        </h3>
                        <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-purple-500 pl-3">
                          {pillars[selectedPillar].managerRoles.audit}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-[#D4AF37]" />
                          What Managers Coach
                        </h3>
                        <p className="text-xs text-[#A09E9A] leading-relaxed bg-[#0D0D14] p-3 rounded-xl border border-white/5">
                          {pillars[selectedPillar].managerRoles.coach}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-amber-500" />
                          What Managers Enforce
                        </h3>
                        <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-amber-500 pl-3">
                          {pillars[selectedPillar].managerRoles.enforce}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Settings size={14} className="text-cyan-400" />
                          Management Tools (Built-in)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {pillars[selectedPillar].managerRoles.tools.map((mt, idx) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white"
                            >
                              {mt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: PRACTICE LABS (7 INTERACTIVE TOOLS) ==================== */}
          {activeTab === 'labs' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Lab Navigation Selector */}
              <div className="glass-card flex flex-col gap-3 h-fit">
                <span className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Practice Tools</span>
                
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setActiveLabTool('photo-analyzer')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'photo-analyzer' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Upload size={14} />
                    <span>Cover Photo Analyzer</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('bio-builder')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'bio-builder' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Edit3 size={14} />
                    <span>Bio Builder & Preview</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('name-readability')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'name-readability' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Info size={14} />
                    <span>Name Readability Test</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('lighting')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'lighting' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Sun size={14} />
                    <span>Lighting Simulator</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('visibility-budget')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'visibility-budget' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Calculator size={14} />
                    <span>Visibility Calculator</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('no-stream-generator')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'no-stream-generator' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Calendar size={14} />
                    <span>No-Stream Generator</span>
                  </button>

                  <button
                    onClick={() => setActiveLabTool('comment-drill')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'comment-drill' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Flame size={14} />
                    <span>Comment Speed Drill</span>
                  </button>
                </div>
              </div>

              {/* Playable Lab Sandbox */}
              <div className="lg:col-span-3 glass-card flex flex-col gap-6">
                
                {/* 1. COVER PHOTO ANALYZER */}
                {activeLabTool === 'photo-analyzer' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Cover Photo Analyzer</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Audit cover photos against Poppo's non-negotiable guidelines.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">CHOOSE A MOCK UPLOAD TEMPLATE</span>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <button 
                            onClick={() => runPhotoAnalysis('poor-selfie')}
                            className={`p-2.5 rounded-xl bg-[#0D0D14] border transition-all flex flex-col items-center gap-2 ${
                              selectedPhotoTemplate === 'poor-selfie' ? 'border-red-500/50 bg-red-950/5' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="w-full aspect-square rounded-lg bg-red-950/20 flex items-center justify-center text-xl">👤❌</div>
                            <span className="text-[10px] font-bold text-white text-center">Dark Selfie</span>
                          </button>

                          <button 
                            onClick={() => runPhotoAnalysis('group-photo')}
                            className={`p-2.5 rounded-xl bg-[#0D0D14] border transition-all flex flex-col items-center gap-2 ${
                              selectedPhotoTemplate === 'group-photo' ? 'border-red-500/50 bg-red-950/5' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="w-full aspect-square rounded-lg bg-yellow-950/20 flex items-center justify-center text-xl">👥❌</div>
                            <span className="text-[10px] font-bold text-white text-center">Group Photo</span>
                          </button>

                          <button 
                            onClick={() => runPhotoAnalysis('approved-cover')}
                            className={`p-2.5 rounded-xl bg-[#0D0D14] border transition-all flex flex-col items-center gap-2 ${
                              selectedPhotoTemplate === 'approved-cover' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="w-full aspect-square rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-xl">👑✅</div>
                            <span className="text-[10px] font-bold text-white text-center">Premium Solo</span>
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 space-y-2">
                          <span className="text-[10px] font-black text-white tracking-widest uppercase block">Photo Standards</span>
                          <p className="text-[11px] text-[#A09E9A] leading-relaxed">
                            Must be a solo portrait with clear facial features, neutral or aesthetic backdrop, adequate brightness, and look high-end. Group portraits or pixelated shots will reduce visibility indexing.
                          </p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col justify-center min-h-[220px] relative">
                        {analyzingPhoto ? (
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="animate-spin text-[#D4AF37]" size={28} />
                            <span className="text-xs text-[#A09E9A] font-bold uppercase tracking-wider">AI Reading File & Scanning Face...</span>
                          </div>
                        ) : photoScore ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white uppercase tracking-wider">Analysis Results</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                photoScore.status === 'APPROVED' ? 'bg-[#D4AF37] text-black' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {photoScore.status}
                              </span>
                            </div>

                            <div className="flex items-end gap-2">
                              <span className="text-3xl font-black text-white">{photoScore.overall}</span>
                              <span className="text-xs text-[#A09E9A] font-bold mb-1">/100 points</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <p className="text-[#A09E9A]"><strong className="text-white font-semibold">Framing:</strong> {photoScore.framing}</p>
                              <p className="text-[#A09E9A]"><strong className="text-white font-semibold">Lighting:</strong> {photoScore.lighting}</p>
                              <p className="text-[#A09E9A]"><strong className="text-white font-semibold">Halo Effect:</strong> {photoScore.haloEffect}</p>
                            </div>

                            <div className="border-t border-white/5 pt-3 space-y-1.5">
                              <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">RECOMMENDED DRILLS</span>
                              {photoScore.feedback.map((f: string, i: number) => (
                                <p key={i} className="text-[11px] text-[#A09E9A] flex gap-2">
                                  <span className="text-[#D4AF37]">•</span>
                                  <span>{f}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[#5A5865] italic text-xs">
                            Select a template on the left to trigger the Cover Photo Analyzer simulation.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BIO BUILDER */}
                {activeLabTool === 'bio-builder' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Bio Builder & Preview</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Design an elegant bio with cognitive readability analysis.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block mb-2">CHOOSE A BIO TEMPLATE</label>
                          <div className="flex flex-wrap gap-2">
                            {bioTemplates.map((t, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setBioText(t.text);
                                  setSelectedBioKeywords([]);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-[#D4AF37]/35 text-[10px] text-white font-bold transition-all"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">WRITE YOUR CUSTOM BIO ({bioText.length}/200 chars)</label>
                          <textarea
                            value={bioText}
                            onChange={(e) => setBioText(e.target.value.slice(0, 200))}
                            placeholder="Type your elevator pitch..."
                            className="w-full h-32 bg-[#0D0D14] border border-white/10 rounded-xl p-3 text-xs text-[#F0EFE8] focus:border-[#D4AF37] focus:outline-none resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">SUGGESTED KEYWORDS</label>
                          <div className="flex flex-wrap gap-1.5">
                            {bioKeywords.map((k) => {
                              const included = bioText.toLowerCase().includes(k.toLowerCase());
                              return (
                                <span
                                  key={k}
                                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                                    included ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-white/5 border border-transparent text-[#A09E9A]'
                                  }`}
                                >
                                  {k}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Mock Poppo Profile Overlay */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">LIVE PROFILE OVERLAY PREVIEW</span>
                        
                        <div className="w-full bg-[#13131E] rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center font-bold text-white">
                              {authState.name?.[0] || 'T'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{authState.name || 'Your Nametag'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-black text-[8px] font-bold uppercase">LVL 12</span>
                              </div>
                              <span className="text-[10px] text-[#A09E9A] font-mono">ID: {authState.poppo_id || '987654321'}</span>
                            </div>
                          </div>

                          <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-3">
                            <span className="text-[8px] font-black text-[#5A5865] uppercase tracking-wider block mb-1">BIO STATEMENT</span>
                            <p className="text-[11px] text-[#F0EFE8] leading-relaxed whitespace-pre-line">
                              {bioText || 'No bio written yet. Select a template or write in the editor.'}
                            </p>
                          </div>
                        </div>

                        {/* Cognitive Analysis */}
                        <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 space-y-2">
                          <span className="text-[10px] font-black text-white uppercase tracking-wider block">BIO QUALITY ANALYSIS</span>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[#A09E9A]">Length Score:</span>
                              <p className={`font-bold mt-0.5 ${bioText.length > 50 ? 'text-[#D4AF37]' : 'text-amber-500'}`}>
                                {bioText.length === 0 ? 'Empty' : bioText.length < 50 ? 'Too Short' : 'Optimal'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#A09E9A]">Call To Action:</span>
                              <p className={`font-bold mt-0.5 ${bioText.toLowerCase().includes('follow') || bioText.toLowerCase().includes('join') ? 'text-[#D4AF37]' : 'text-[#A09E9A]'}`}>
                                {bioText.toLowerCase().includes('follow') || bioText.toLowerCase().includes('join') ? 'Detected' : 'Missing'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. NAME READABILITY TEST */}
                {activeLabTool === 'name-readability' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Name Readability Test</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Verify that your stream nametag meets cognitive fluency standards.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">ENTER STREAMING NICKNAME</label>
                          <input
                            type="text"
                            value={nametagText}
                            onChange={(e) => testNametag(e.target.value)}
                            placeholder="e.g. ✨💎_Luna$$-999_💎✨"
                            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-3 text-xs text-[#F0EFE8] focus:border-[#D4AF37] focus:outline-none"
                          />
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 space-y-2 text-xs text-[#A09E9A] leading-relaxed">
                          <span className="text-[10px] font-black text-white tracking-widest uppercase block">Readability Checklist</span>
                          <p>❌ No excess emojis block search engines.</p>
                          <p>❌ Avoid strings of random digits (e.g. Host9947583).</p>
                          <p>✅ Keep pronunciation simple for co-hosts in audio PK rooms.</p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col justify-center min-h-[200px]">
                        {nametagResult ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white uppercase tracking-wider">Name Score</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                nametagResult.score >= 80 ? 'bg-[#D4AF37] text-black' : 'bg-amber-500/20 text-amber-500'
                              }`}>
                                {nametagResult.cognitiveFluency}
                              </span>
                            </div>

                            <div className="flex items-end gap-2">
                              <span className="text-3xl font-black text-white">{nametagResult.score}</span>
                              <span className="text-xs text-[#A09E9A] font-bold mb-1">/100 cognitive index</span>
                            </div>

                            <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-[#D4AF37] pl-3">
                              {nametagResult.recommendation}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center text-[#5A5865] italic text-xs">
                            Type a nickname on the left to analyze nametag readability.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. LIGHTING SIMULATOR */}
                {activeLabTool === 'lighting' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Lighting Simulator</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Preview how different physical lighting setups affect video quality and user trust.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">SELECT LIGHTING SETUP</span>
                        
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'backlit', label: 'Windows Backlit (Harsh Backlight)', score: 30, desc: 'Camera auto-exposure darkens the subject face to a complete silhouette.' },
                            { id: 'overhead', label: 'Overhead Room Bulb (Harsh Shadows)', score: 50, desc: 'Creates deep shadows under the eyes and nose. Looks amateur.' },
                            { id: 'lowlight', label: 'Low Light (Pixelated & Dark)', score: 20, desc: 'Triggers camera digital noise and extreme video grain. Viewers leave instantly.' },
                            { id: 'ringlight', label: 'Frontal Ring Light (Balanced)', score: 80, desc: 'Smooth, soft frontal glow. Excellent facial detail and catchlight in eyes.' },
                            { id: 'studio', label: '3-Point Studio (Premium Setup)', score: 98, desc: 'Key light, fill light, and background rim light. Professional 3D depth.' }
                          ].map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => setLightingPreset(preset.id as any)}
                              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                lightingPreset === preset.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-white' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A] hover:bg-white/03'
                              }`}
                            >
                              <div>
                                <p className="text-xs font-bold">{preset.label}</p>
                                <p className="text-[10px] text-[#A09E9A] mt-0.5 truncate max-w-[240px]">{preset.desc}</p>
                              </div>
                              <span className={`text-xs font-black ${preset.score >= 80 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
                                {preset.score}/100
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visual Sandbox Frame rendering */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4 items-center justify-center">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider self-start">SIMULATED VIDEO MONITOR</span>
                        
                        <div className="w-full max-w-[280px] aspect-[9/16] rounded-3xl border border-white/10 overflow-hidden relative flex flex-col justify-between p-4 shadow-2xl transition-all duration-300"
                          style={{
                            boxShadow: lightingPreset === 'studio' ? '0 0 35px rgba(212,175,55,0.15)' : 'none',
                            background: 
                              lightingPreset === 'backlit' ? 'linear-gradient(to top, #111 40%, #fff 100%)' :
                              lightingPreset === 'overhead' ? 'linear-gradient(to bottom, #444 0%, #111 80%)' :
                              lightingPreset === 'lowlight' ? '#07070a' :
                              lightingPreset === 'ringlight' ? '#181825' : '#222235'
                          }}
                        >
                          {/* Live Indicator */}
                          <div className="flex justify-between items-center w-full">
                            <span className="px-2 py-0.5 rounded bg-red-600 text-[8px] font-black text-white uppercase tracking-wider animate-pulse">LIVE</span>
                            <span className="text-[8px] text-white/50 font-bold bg-black/40 px-1.5 py-0.5 rounded-full">👤 142</span>
                          </div>

                          {/* Simulated Face Image Mock */}
                          <div className="flex flex-col items-center justify-center flex-1">
                            <div className="w-20 h-20 rounded-full border-2 border-white/25 flex items-center justify-center relative overflow-hidden transition-all duration-300"
                              style={{
                                filter: 
                                  lightingPreset === 'backlit' ? 'brightness(0.3) contrast(1.5)' :
                                  lightingPreset === 'overhead' ? 'brightness(0.7) contrast(1.2)' :
                                  lightingPreset === 'lowlight' ? 'brightness(0.3) blur(1px)' :
                                  lightingPreset === 'ringlight' ? 'brightness(1.1)' : 'brightness(1.2) contrast(1.05)'
                              }}
                            >
                              <span className="text-3xl">👩‍🎤</span>
                            </div>
                            <span className="text-[9px] text-white/60 font-bold mt-2 uppercase tracking-widest">Host Camera</span>
                          </div>

                          {/* Bottom Stats Overlay */}
                          <div className="w-full bg-black/40 backdrop-blur-md rounded-xl p-2 text-[9px] text-white/80 space-y-1">
                            <p className="font-bold">Ambient Scan: {
                              lightingPreset === 'backlit' ? 'Backlit Silhouette Detected' :
                              lightingPreset === 'overhead' ? 'Under-eye Shadow Warn' :
                              lightingPreset === 'lowlight' ? 'Extreme Video Noise' :
                              lightingPreset === 'ringlight' ? 'Optimal Brightness' : 'Balanced Studio Output'
                            }</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. VISIBILITY BUDGET CALCULATOR */}
                {activeLabTool === 'visibility-budget' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Visibility Budget Calculator</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Plan your coin investments (Lucky Boxes) and PK matches to spike algorithm traffic.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-[#A09E9A] uppercase tracking-wider">Lucky Boxes (5,000 Coins each)</span>
                            <span className="text-[#D4AF37]">{visibilityBoxes} boxes</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={visibilityBoxes}
                            onChange={(e) => setVisibilityBoxes(Number(e.target.value))}
                            className="w-full accent-[#D4AF37]"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-[#A09E9A] uppercase tracking-wider">Scheduled Daily PK Matches</span>
                            <span className="text-cyan-400">{visibilityPKs} PKs</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={visibilityPKs}
                            onChange={(e) => setVisibilityPKs(Number(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 space-y-2 text-xs">
                          <span className="text-[10px] font-black text-white tracking-widest uppercase block">Investment Rule</span>
                          <p className="text-[#A09E9A] leading-relaxed">
                            Do not stream in obscurity! Dropping a Lucky Box spikes user count. Running a co-host PK immediately after locks that traffic in through competitive gamification.
                          </p>
                        </div>
                      </div>

                      {/* Calculations Panel */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">ALGORITHMIC ROI PROJECTION</span>
                        
                        {calculatedVisibility && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-[#13131E] rounded-xl border border-white/5">
                                <span className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Estimated Reach</span>
                                <p className="text-xl font-black text-cyan-400 mt-1">+{calculatedVisibility.estimatedReach} viewers</p>
                              </div>
                              <div className="p-3 bg-[#13131E] rounded-xl border border-white/5">
                                <span className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Algorithm Booster</span>
                                <p className="text-xl font-black text-[#D4AF37] mt-1">{calculatedVisibility.boosterMultiplier}x power</p>
                              </div>
                            </div>

                            <div className="space-y-1 text-xs">
                              <p className="text-[#A09E9A]"><strong className="text-white font-semibold">Optimal Launch Hours:</strong> {calculatedVisibility.optimalPKHours}</p>
                              <p className="text-[#A09E9A]"><strong className="text-white font-semibold">ROI efficiency:</strong> {calculatedVisibility.roiScore}% traction score</p>
                            </div>

                            <div className="border-t border-white/5 pt-3 space-y-1 bg-[#13131E]/40 p-3 rounded-xl">
                              <span className="text-[9px] font-black text-white uppercase tracking-wider block">AI Strategy Audit</span>
                              <p className="text-[11px] text-[#A09E9A] leading-relaxed">{calculatedVisibility.assessment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. NO-STREAM UPDATE GENERATOR */}
                {activeLabTool === 'no-stream-generator' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">No-Stream Update Generator</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Generate professional pre-written notices to maintain fanbase loyalty when you cannot stream.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">REASON FOR ABSENCE</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'sick', label: 'Illness / Rest' },
                            { id: 'family', label: 'Family Commitment' },
                            { id: 'travel', label: 'Travel / Shift' },
                            { id: 'recharge', label: 'Mental Recharge' }
                          ].map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setNoStreamReason(r.id as any)}
                              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                noStreamReason === r.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-white' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A] hover:bg-white/03'
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Date of Absence</label>
                            <input
                              type="date"
                              value={noStreamDate}
                              onChange={(e) => setNoStreamDate(e.target.value)}
                              className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Return Live Date</label>
                            <input
                              type="date"
                              value={noStreamReturnDate}
                              onChange={(e) => setNoStreamReturnDate(e.target.value)}
                              className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Generated Text & Copy */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider">GENERATED STATUS ANNOUNCEMENT</span>
                          <button
                            onClick={copyToClipboard}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            {copiedStatus ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex-1 bg-[#13131E] border border-white/5 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-[#A09E9A] whitespace-pre-wrap select-all max-h-[220px] overflow-y-auto">
                          {generatedNoStreamText}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. COMMENT RESPONSE SPEED DRILL */}
                {activeLabTool === 'comment-drill' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Comment Response Speed Drill</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Train your response speed. Avoid dead air by reacting to incoming chat messages within 3 seconds!</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-3 bg-[#0D0D14] p-4 rounded-2xl border border-white/5 text-xs text-[#A09E9A] leading-relaxed">
                          <span className="text-[10px] font-black text-white tracking-widest uppercase block">Game Instructions</span>
                          <p>1. Press <strong>Start 20s Drill</strong> to begin.</p>
                          <p>2. Chat comments will appear on the monitor screen.</p>
                          <p>3. Match the correct reaction button below as quickly as possible!</p>
                          <p>4. Fast reaction rates yield a high Algorithmic Index.</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-[#A09E9A]">Score:</span>
                            <span className="text-[#D4AF37] font-black">{drillScore} answered</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-[#A09E9A]">Misses / Dead Air:</span>
                            <span className="text-red-400 font-black">{drillMissed} limits</span>
                          </div>
                        </div>

                        {!drillActive ? (
                          <button
                            onClick={handleStartDrill}
                            className="btn-gold py-3 w-full text-center flex items-center justify-center gap-2"
                          >
                            <Play size={14} fill="currentColor" />
                            <span>Start 20s Drill</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-center text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">
                            Drill Running — {20 - drillElapsed}s Left!
                          </div>
                        )}
                      </div>

                      {/* Interactive monitor console */}
                      <div className="p-4 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider">CHAT RESPONSE FEED</span>
                        
                        <div className="bg-[#13131E] border border-white/5 rounded-2xl p-3 h-48 overflow-y-auto custom-scrollbar space-y-2 flex flex-col justify-end">
                          {drillComments.map((comment) => (
                            <div key={comment.id} className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5 animate-fadeIn">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-[#A09E9A] font-mono">Anonymous Viewer</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  comment.type === 'greeting' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                                  comment.type === 'question' ? 'bg-cyan-500/20 text-cyan-400' :
                                  comment.type === 'gift' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {comment.type}
                                </span>
                              </div>
                              <p className="text-xs text-white font-bold">{comment.text}</p>
                              
                              {/* Respond Actions */}
                              {drillActive && (
                                <div className="grid grid-cols-2 gap-1.5 mt-1 border-t border-white/5 pt-1.5">
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'greeting')}
                                    className="px-2 py-1 rounded bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[9px] font-bold text-[#D4AF37]"
                                  >
                                    Welcome Tag
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'question')}
                                    className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-[9px] font-bold text-cyan-400"
                                  >
                                    Answer Ques
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'gift')}
                                    className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[9px] font-bold text-emerald-400"
                                  >
                                    Thank Gift
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'spam')}
                                    className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-[9px] font-bold text-red-400"
                                  >
                                    Flag Spam
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {!drillActive && drillScore === 0 && (
                            <div className="text-center text-[#5A5865] italic text-xs h-full flex items-center justify-center">
                              Drill is idle. Click Start to begin the session.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          )}

          {/* ==================== TAB: CERTIFICATION TRACK ==================== */}
          {activeTab === 'certifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Certification Tiers</h2>
                <p className="text-xs text-[#A09E9A] mt-1">Complete each module curriculum and score 100% on the evaluation quiz to claim your badge.</p>
              </div>

              {!selectedQuizLevel ? (
                /* List of available quizzes */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { id: 'beginner', title: 'Beginner Certification', desc: 'Focuses on profile design standards, digital handshake, basic live setups, and lighting.', icon: Trophy, color: 'text-amber-500' },
                    { id: 'intermediate', title: 'Intermediate Certification', desc: 'Consistency models, Lucky Box integration, random PK timing strategies, and dead air control.', icon: Trophy, color: 'text-slate-400' },
                    { id: 'advanced', title: 'Advanced Certification', desc: 'Monetization psychology, audience conversion funnels, group chat retention calendars.', icon: Trophy, color: 'text-yellow-400' },
                    { id: 'pro', title: 'Pro Streamer Certification', desc: 'Mastery class final check. Enforces professional coaching tools, loops, and diagnostic checklists.', icon: Award, color: 'text-emerald-400' }
                  ].map((cert) => {
                    const completed = quizResultsHistory[cert.id];
                    return (
                      <div key={cert.id} className="glass-card flex flex-col justify-between gap-4 border border-white/5 hover:border-[#D4AF37]/20 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${cert.color}`}>
                              <cert.icon size={22} />
                            </div>
                            {completed && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">PASSED</span>
                            )}
                          </div>

                          <h3 className="text-sm font-black text-white uppercase tracking-wider">{cert.title}</h3>
                          <p className="text-xs text-[#A09E9A] leading-relaxed">{cert.desc}</p>
                        </div>

                        {completed ? (
                          <button
                            onClick={() => setViewingCertificate(cert.id)}
                            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-all text-center"
                          >
                            View Certificate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartQuiz(cert.id)}
                            className="btn-gold py-2 w-full text-center"
                          >
                            Take Quiz
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Quiz Game Active */
                <div className="glass-card max-w-2xl mx-auto space-y-6">
                  {(() => {
                    const quiz = quizzes.find(q => q.level === selectedQuizLevel);
                    if (!quiz) return null;
                    const question = quiz.questions[currentQuizQuestionIndex];

                    return (
                      <>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">{quiz.title}</span>
                          <span className="text-xs text-[#A09E9A] font-bold">
                            Question {currentQuizQuestionIndex + 1} of {quiz.questions.length}
                          </span>
                        </div>

                        {!quizFinished ? (
                          <div className="space-y-6 animate-fadeIn">
                            <h3 className="text-sm font-black text-white uppercase tracking-wide leading-relaxed">
                              {question.question}
                            </h3>

                            <div className="flex flex-col gap-2.5">
                              {question.options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectOption(oIdx)}
                                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-semibold ${
                                    selectedOption === oIdx
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
                                onClick={() => setSelectedQuizLevel(null)}
                                className="px-4 py-2 text-xs font-bold text-[#5A5865] hover:text-white"
                              >
                                Cancel Quiz
                              </button>
                              
                              <button
                                onClick={() => handleNextQuestion(question.correctAnswer)}
                                disabled={selectedOption === null}
                                className="btn-gold"
                              >
                                {currentQuizQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Quiz Complete Results */
                          <div className="text-center py-6 space-y-6 animate-fadeIn">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] mb-2">
                              <Award size={32} />
                            </div>

                            <div>
                              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Quiz Completed!</h3>
                              <p className="text-xs text-[#A09E9A]">
                                Score: <strong className="text-white font-bold">{quizScore}</strong> of {quiz.questions.length} correct.
                              </p>
                            </div>

                            {quizScore === quiz.questions.length ? (
                              <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 rounded-2xl max-w-md mx-auto text-xs text-[#A09E9A] leading-relaxed">
                                <span className="text-[#D4AF37] font-bold block mb-1">🎉 PERFECT SCORE!</span>
                                You have successfully passed the evaluation and unlocked the {quiz.title} Certificate.
                              </div>
                            ) : (
                              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl max-w-md mx-auto text-xs text-red-400 leading-relaxed">
                                <span className="font-bold block mb-1">❌ RETRY REQUIRED</span>
                                You must score 100% (all questions correct) to earn your official certificate.
                              </div>
                            )}

                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={() => setSelectedQuizLevel(null)}
                                className="px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-[#A09E9A] hover:text-white transition-all cursor-pointer"
                              >
                                Back to Tiers
                              </button>
                              {quizScore < quiz.questions.length ? (
                                <button
                                  onClick={() => handleStartQuiz(selectedQuizLevel)}
                                  className="btn-gold"
                                >
                                  Retry Quiz
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setViewingCertificate(selectedQuizLevel);
                                    setSelectedQuizLevel(null);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
                                >
                                  View Certificate
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: AI RECOMMENDATION ENGINE ==================== */}
          {activeTab === 'ai-coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Request selector */}
              <div className="glass-card flex flex-col gap-5 h-fit">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Coaching Focus</h3>
                  <p className="text-xs text-[#A09E9A] mt-1">Select a key metric category to generate diagnostic action steps.</p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'retention', label: 'Improve Watch Duration (Retention)', icon: Clock },
                    { id: 'monetization', label: 'Ethical Revenue & Coin Framing', icon: DollarSign },
                    { id: 'visibility', label: 'Algorithmic PK Boost Strategy', icon: Flame }
                  ].map((focus) => (
                    <button
                      key={focus.id}
                      onClick={() => setAiFocus(focus.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 text-xs font-bold ${
                        aiFocus === focus.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                      }`}
                    >
                      <focus.icon size={15} />
                      <span>{focus.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={generateAiPlan}
                  className="btn-gold py-3 w-full text-center flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} className="animate-pulse" />
                  <span>Generate AI Action Plan</span>
                </button>
              </div>

              {/* Generated Consultation Plan */}
              <div className="lg:col-span-2 glass-card min-h-[300px] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-48 h-48 bg-radial from-[#D4AF37]/5 to-transparent blur-3xl pointer-events-none" />

                {generatingPlan ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-[#D4AF37]" size={28} />
                    <span className="text-xs text-[#A09E9A] font-bold uppercase tracking-wider">AI analyzing your historical logs & metrics...</span>
                  </div>
                ) : generatedPlan ? (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider block">PERSONALIZED STRATEGY BRIEF</span>
                      <h3 className="text-lg font-black text-white font-['Outfit'] mt-1">{generatedPlan.title}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5 text-xs">
                        <span className="text-[#A09E9A]">Target Output:</span>
                        <p className="font-bold text-white mt-0.5">{generatedPlan.metrics.target}</p>
                      </div>
                      <div className="p-3 bg-[#0D0D14] rounded-xl border border-white/5 text-xs">
                        <span className="text-[#A09E9A]">Current Baseline:</span>
                        <p className="font-bold text-[#A09E9A] mt-0.5">{generatedPlan.metrics.current}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider block">RECOMMENDED ACTION ITEMS</span>
                      {generatedPlan.actionSteps.map((step: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#0D0D14] rounded-xl border border-white/5 space-y-1">
                          <p className="text-xs font-bold text-white">{idx + 1}. {step.title}</p>
                          <p className="text-[11px] text-[#A09E9A] leading-relaxed">{step.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-black text-white uppercase tracking-wider block">AI GENERATED STREAMING SCRIPT</span>
                      {generatedPlan.scripts.map((script: any, idx: number) => (
                        <div key={idx} className="space-y-1 text-xs">
                          <span className="text-[10px] text-[#D4AF37] font-semibold">{script.situation}</span>
                          <p className="text-white italic leading-relaxed font-serif">"{script.quote}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#5A5865] italic text-xs">
                    Choose a coaching category on the left, then click Generate to construct an AI Diagnostic Review.
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ==================== CERTIFICATE PREVIEW MODAL ==================== */}
      <AnimatePresence>
        {viewingCertificate && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCertificate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-[#1A1A28] border border-[#D4AF37]/35 rounded-3xl overflow-hidden p-6 sm:p-12 shadow-[0_0_80px_rgba(212,175,55,0.15)] flex flex-col gap-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setViewingCertificate(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Certificate layout design */}
              <div className="w-full border-4 border-double border-[#D4AF37]/50 rounded-2xl p-6 sm:p-10 bg-[#0D0D14] flex flex-col items-center text-center gap-6 relative">
                {/* Background watermarks */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.02)_0%,transparent_70%)] pointer-events-none" />
                
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.25em]">OFFICIAL ACCREDITATION</div>
                  <h3 className="text-2xl font-black text-white font-['Outfit'] tracking-widest uppercase">NINE TALENT MANAGEMENT</h3>
                </div>

                <div className="w-20 h-[1px] bg-[#D4AF37]/30" />

                <div className="space-y-2">
                  <p className="text-xs text-[#A09E9A] italic">This certifies that host</p>
                  <p className="text-xl font-black text-[#D4AF37] font-['Outfit'] tracking-wide">{authState.name || 'Your Name'}</p>
                  <p className="text-xs text-[#A09E9A] max-w-md mx-auto leading-relaxed">
                    has successfully demonstrated professional knowledge and finished execution drills for the corresponding tier:
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-black text-white tracking-widest uppercase">
                    {viewingCertificate === 'beginner' ? 'Beginner Streaming Badge' :
                     viewingCertificate === 'intermediate' ? 'Intermediate Streaming Specialist' :
                     viewingCertificate === 'advanced' ? 'Advanced Retention Strategist' : 'Pro Streaming Master'}
                  </p>
                  <p className="text-[9px] text-[#A09E9A]/60 font-mono">CERTIFICATE ID: NTM-{viewingCertificate?.toUpperCase()}-{authState.poppo_id || '98765'}</p>
                </div>

                {/* Seal stamp and sign off */}
                <div className="flex justify-between items-center w-full max-w-md mt-4">
                  <div className="text-left space-y-1 border-t border-white/10 pt-2 w-28">
                    <p className="text-[8px] text-[#A09E9A] font-bold">DATE ISSUED</p>
                    <p className="text-[9px] text-white font-bold font-mono">{new Date().toLocaleDateString()}</p>
                  </div>

                  {/* Visual Gold Stamp */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D4AF37] flex items-center justify-center relative rotate-12 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex flex-col items-center justify-center text-[#D4AF37] text-[8px] font-black tracking-widest">
                      <span>NINE</span>
                      <span>GOLD</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1 border-t border-white/10 pt-2 w-28">
                    <p className="text-[8px] text-[#A09E9A] font-bold">APPROVED BY</p>
                    <p className="text-[9px] text-[#D4AF37] font-bold italic">Miss Nine Director</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setViewingCertificate(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Close Window
                </button>
                <button
                  onClick={() => alert('Mock certificate downloading initiated!')}
                  className="btn-gold px-5 py-2.5 text-xs"
                >
                  Download Certificate (PDF)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
