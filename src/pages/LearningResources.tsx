import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Trophy, Award, GraduationCap, Play, CheckCircle2, AlertTriangle, 
  Lightbulb, Calculator, HelpCircle, Edit3, Volume2, Video, Sun, Calendar, 
  Flame, MessageCircle, Heart, DollarSign, Target, Settings, Info, RefreshCw, 
  Copy, Check, Star, Sparkles, ChevronRight, User, Users, Shield, Zap, Upload, Clock, X
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

interface Quiz {
  title: string;
  level: string;
  questions: QuizQuestion[];
}

interface ExamScore {
  category: string; // 'foundations' | 'growth' | 'mastery'
  score: number;
  total: number;
  passed: boolean;
  timestamp: string;
}

const FLASHCARDS = [
  {
    id: 1,
    pillar: 'Pillar 1: Profile Optimization',
    question: 'What is the "Digital Handshake" and how long does it take?',
    answer: 'It is the visual trust and cognitive fluency built with viewers in under 3 seconds. The core elements are a professional solo cover photo, a clear memorizable nametag, and an elevator-pitch bio.'
  },
  {
    id: 2,
    pillar: 'Pillar 2: Live Quality',
    question: 'Why is audio quality prioritized over video quality?',
    answer: 'Viewers will tolerate average video clarity, but bad, noisy, echoing, or distorted audio triggers subconscious cognitive load and causes immediate room exits.'
  },
  {
    id: 3,
    pillar: 'Pillar 3: Timing & Consistency',
    question: 'What is the standard procedure for an emergency stream cancellation?',
    answer: 'Write and post a formatted update in your Fanclub Group Chat at least 2 hours before the schedule starts. State the absence date, reason, and return live date.'
  },
  {
    id: 4,
    pillar: 'Pillar 4: Visibility Investment',
    question: 'What is the algorithmic timing for dropping a Lucky Box before a Random PK?',
    answer: 'Deploy the Lucky Box exactly 2 minutes before triggering the PK match. The countdown draws traffic and spikes room counts just when the algorithmic multiplier evaluates PK engagement.'
  },
  {
    id: 5,
    pillar: 'Pillar 5: In-Stream Interaction',
    question: 'What is "Dead Air" and how do you prevent it?',
    answer: 'Dead Air is silence or visual inactivity. Combat it by speaking continuously (telling personal stories, playing games, explaining coin goals, reading usernames) even if the chat is quiet.'
  },
  {
    id: 6,
    pillar: 'Pillar 6: Fanbase Development',
    question: 'What is the viewer conversion funnel order?',
    answer: 'The conversion path is: Scrolling Visitor → Active Chat Participant → Follower → Fanclub Subscriber → Loyal VIP/Gifter.'
  },
  {
    id: 7,
    pillar: 'Pillar 7: Retention',
    question: 'How do you maintain emotional continuity outside live hours?',
    answer: 'Maintain daily offline check-ins in your Fanclub Group Chat, share schedules/highlights, run Sunday requests, and celebrate supporter milestones.'
  },
  {
    id: 8,
    pillar: 'Pillar 8: Monetization',
    question: 'What is a "Gratitude Loop" and its 3 steps?',
    answer: 'A structured reaction system that rewards donors: 1. Intense emotional validation (surprise), 2. Action cue (dance/sound effect), 3. Prestige marker (writing their name on your whiteboard).'
  },
  {
    id: 9,
    pillar: 'Pillar 9: Intentional Goal Setting',
    question: 'What are the "Four Goal Arches"?',
    answer: 'Targets set across 4 areas: 1. Financial (Coins), 2. Audience (Community/Follows), 3. Skill (Talent/Vocal), and 4. Infrastructure (Live Quality).'
  }
];

export function LearningResources() {
  const location = useLocation();

  // Navigation & View settings
  const [activeTab, setActiveTab] = useState<'onboarding' | 'dashboard' | 'pillars' | 'labs' | 'certifications' | 'ai-coach'>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as any;
    if (['onboarding', 'dashboard', 'pillars', 'labs', 'certifications', 'ai-coach'].includes(tabParam)) {
      return tabParam;
    }
    return 'onboarding';
  });
  const [persona, setPersona] = useState<'host' | 'manager'>('host');
  const [selectedPillar, setSelectedPillar] = useState<number>(0);

  // Sync tab with URL query parameter changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as any;
    if (tabParam && ['onboarding', 'dashboard', 'pillars', 'labs', 'certifications', 'ai-coach'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Onboarding 101 state hooks
  const [onboardAudioChecked, setOnboardAudioChecked] = useState(false);
  const [onboardAudioVolume, setOnboardAudioVolume] = useState(0); // 0 = silent, 50 = perfect, 100 = too loud
  const [onboardLightingValue, setOnboardLightingValue] = useState(50);
  const [onboardNoticePosted, setOnboardNoticePosted] = useState(false);
  const [onboardGoalText, setOnboardGoalText] = useState('');
  const [onboardGoalDeclared, setOnboardGoalDeclared] = useState(false);
  const [onboardCheckedCount, setOnboardCheckedCount] = useState(0);
  const [onboardStreamReady, setOnboardStreamReady] = useState(false);
  
  // Onboard Mock PK Arena state hooks
  const [pkArenaActive, setPkArenaActive] = useState(false);
  const [pkArenaTimer, setPkArenaTimer] = useState(30);
  const [pkHostPoints, setPkHostPoints] = useState(10000);
  const [pkOpponentPoints, setPkOpponentPoints] = useState(9500);
  const [pkArenaLog, setPkArenaLog] = useState<string[]>([]);
  const [pkArenaResult, setPkArenaResult] = useState<'win' | 'lose' | null>(null);

  // Onboard Coaching Roleplay state hooks
  const [roleplayScenarioIdx, setRoleplayScenarioIdx] = useState(0);
  const [roleplayScore, setRoleplayScore] = useState(0);
  const [roleplayChoiceFeedback, setRoleplayChoiceFeedback] = useState<string | null>(null);
  const [roleplayFinished, setRoleplayFinished] = useState(false);

  // Onboard Compliance Audit Sandbox state hooks
  const [auditProfileIdx, setAuditProfileIdx] = useState(0);
  const [auditScore, setAuditScore] = useState(0);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);
  const [auditFinished, setAuditFinished] = useState(false);

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

  // Onboarding Pre-stream checklist count check
  useEffect(() => {
    let count = 0;
    if (onboardAudioChecked && onboardAudioVolume >= 40 && onboardAudioVolume <= 70) count++;
    if (onboardLightingValue >= 75) count++;
    if (onboardNoticePosted) count++;
    if (onboardGoalDeclared && onboardGoalText.trim().length > 0) count++;
    setOnboardCheckedCount(count);
  }, [onboardAudioChecked, onboardAudioVolume, onboardLightingValue, onboardNoticePosted, onboardGoalDeclared, onboardGoalText]);

  // Onboard Mock PK Arena Timer tick
  useEffect(() => {
    let timerId: any;
    if (pkArenaActive && pkArenaTimer > 0 && !pkArenaResult) {
      timerId = setInterval(() => {
        setPkArenaTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            if (pkHostPoints > pkOpponentPoints) {
              setPkArenaResult('win');
            } else {
              setPkArenaResult('lose');
            }
            return 0;
          }
          // Opponent randomly gains points
          setPkOpponentPoints(opp => opp + Math.floor(Math.random() * 800) + 200);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [pkArenaActive, pkArenaTimer, pkHostPoints, pkOpponentPoints, pkArenaResult]);

  const handlePkAction = (actionType: 'gratitude' | 'cta' | 'double') => {
    if (!pkArenaActive || pkArenaResult) return;
    if (actionType === 'gratitude') {
      setPkHostPoints(prev => prev + 2500);
      setPkArenaLog(prev => ['[Gratitude Loop] Thanked donors and played signature sound effect! (+2,500 pts)', ...prev]);
    } else if (actionType === 'cta') {
      setPkHostPoints(prev => prev + 1800);
      setPkArenaLog(prev => ['[Call-to-Action] Shared the stream goal mission and asked for support! (+1,800 pts)', ...prev]);
    } else {
      setPkHostPoints(prev => prev + 3500);
      setPkArenaLog(prev => ['[Double Booster] Synchronized box timing with random PK boost! (+3,500 pts)', ...prev]);
    }
  };

  const resetPkArena = () => {
    setPkArenaActive(false);
    setPkArenaTimer(30);
    setPkHostPoints(10000);
    setPkOpponentPoints(9500);
    setPkArenaLog([]);
    setPkArenaResult(null);
  };

  // Coaching Roleplay Scenarios
  const coachingScenarios = [
    {
      title: 'Discouraged Host',
      desc: 'Host Lily calls you crying because she streamed for 3 hours and only made 150 points. She wants to quit.',
      options: [
        {
          text: 'Enforce consistency: Tell her streaming is hard work and she needs to hit her 6-hour daily quota.',
          score: 10,
          feedback: 'Lily feels pressured and unheard. She ends up failing to log on next week. (Poor coaching choice)'
        },
        {
          text: 'Pillar 9 Goal-Setting audit: Help her set a micro-goal for community growth and restructure her screen goals.',
          score: 100,
          feedback: 'Lily realizes she focused only on earnings, neglecting the Community and Skill arches. She returns with renewed purpose. (Excellent coaching choice!)'
        }
      ]
    },
    {
      title: 'Technical Discomfort',
      desc: 'Host Mike has a noisy fan in the background and poor face lighting, causing viewers to leave within seconds.',
      options: [
        {
          text: 'Pillar 2 Live Quality enforcement: Complete a scorecard, ask him to use a headset, and adjust camera angle to eye-level.',
          score: 100,
          feedback: 'Mike instantly resolves echo and shadows. Watch duration triples. (Excellent coaching choice!)'
        },
        {
          text: 'Suggest he buy professional studio microphone and camera gear.',
          score: 30,
          feedback: 'Mike does not have the budget for high-end gear and feels discouraged from streaming. (Suboptimal choice)'
        }
      ]
    }
  ];

  const handleRoleplayChoice = (optionIdx: number) => {
    const scenario = coachingScenarios[roleplayScenarioIdx];
    const option = scenario.options[optionIdx];
    setRoleplayScore(prev => prev + option.score);
    setRoleplayChoiceFeedback(option.feedback);
  };

  const handleNextRoleplay = () => {
    setRoleplayChoiceFeedback(null);
    if (roleplayScenarioIdx < coachingScenarios.length - 1) {
      setRoleplayScenarioIdx(prev => prev + 1);
    } else {
      setRoleplayFinished(true);
    }
  };

  const resetRoleplay = () => {
    setRoleplayScenarioIdx(0);
    setRoleplayScore(0);
    setRoleplayChoiceFeedback(null);
    setRoleplayFinished(false);
  };

  // Compliance Audit Sandbox Profiles
  const auditProfiles = [
    {
      name: '✨💎_CuteGamer999_💎✨',
      cover: 'Group photo at a restaurant, dimly lit.',
      bio: 'Placeholder bio text here...',
      issues: ['Group photo', 'Confusing nametag symbols', 'Generic placeholder bio'],
      isCompliant: false,
      explanation: 'Violates Pillar 1 Profile Optimization: Nametag lacks fluency, cover photo lacks solo focus, and bio is a placeholder.'
    },
    {
      name: 'EmmaLive',
      cover: 'Solo portrait, clear face, ring light reflections in eyes, aesthetic bedroom backdrop.',
      bio: 'Late night cozy chats & live music requests! 🎤 Daily streams starting 9 PM EST. Join the Emma family! ✨',
      issues: [],
      isCompliant: true,
      explanation: 'Fully compliant! Solo cover photo, readable nametag, clear bio with scheduled times and Follow CTAs.'
    }
  ];

  const handleAuditAction = (userChoice: boolean) => {
    const profile = auditProfiles[auditProfileIdx];
    if (profile.isCompliant === userChoice) {
      setAuditScore(prev => prev + 50);
      setAuditFeedback(`Correct! ${profile.explanation}`);
    } else {
      setAuditFeedback(`Incorrect. ${profile.explanation}`);
    }
  };

  const handleNextAudit = () => {
    setAuditFeedback(null);
    if (auditProfileIdx < auditProfiles.length - 1) {
      setAuditProfileIdx(prev => prev + 1);
    } else {
      setAuditFinished(true);
    }
  };

  const resetAudit = () => {
    setAuditProfileIdx(0);
    setAuditScore(0);
    setAuditFeedback(null);
    setAuditFinished(false);
  };

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

  // Active Tool Lab States (defaulting to bio-builder since photo analyzer is removed)
  const [activeLabTool, setActiveLabTool] = useState<string>('bio-builder');

  // Bio Builder States
  const [bioText, setBioText] = useState('Hey guys! Welcome to my profile! I am a **Singer** who loves **Interactive PK Battles**. 💖 Daily streams starting **9 PM EST**! Join the **Luna Family 🌙**!');
  const [bioTalent, setBioTalent] = useState('Singer');
  const [bioStyle, setBioStyle] = useState('Interactive PK Battles');
  const [bioSchedule, setBioSchedule] = useState('Daily at 9 PM EST');
  const [bioTribe, setBioTribe] = useState('Luna Family 🌙');
  const [bioStep, setBioStep] = useState<'questionnaire' | 'generated'>('questionnaire');

  const [bioTemplates] = useState([
    { name: 'Friendly Late-Night Chat', talent: 'Chitchat Host', style: 'Late-Night Cozy Vibes', schedule: 'Every night at 9 PM EST', tribe: 'Cozy Clan ✨' },
    { name: 'Talented Vocalist', talent: 'Singer', style: 'Live Song Requests', schedule: 'Daily at 6 PM EST', tribe: 'Melody Fam 🎤' },
    { name: 'Casual Gamer', talent: 'Gamer', style: 'Live Gaming Drills & PKs', schedule: 'Mon-Fri 4 PM EST', tribe: 'GG Warriors 🎮' }
  ]);

  // Name Readability States
  const [nametagText, setNametagText] = useState('');
  const [nametagResult, setNametagResult] = useState<any | null>(null);

  // Lucky Box Setup Simulator States
  const [luckyGameType, setLuckyGameType] = useState<'split' | 'draw'>('split');
  const [luckyCoinPool, setLuckyCoinPool] = useState<number>(100);
  const [luckyWinners, setLuckyWinners] = useState<number>(10);
  const [luckyCustomWinners, setLuckyCustomWinners] = useState<string>('');
  const [luckyWinnersMode, setLuckyWinnersMode] = useState<'preset' | 'custom'>('preset');
  const [luckyCondition, setLuckyCondition] = useState<'all' | 'follow' | 'fanclub' | 'code'>('all');
  const [luckyClaimMethod, setLuckyClaimMethod] = useState<'grab' | 'random'>('grab');
  const [luckyTimer, setLuckyTimer] = useState<'3min' | '5min' | '10min'>('3min');
  const [luckyBoxSimStatus, setLuckyBoxSimStatus] = useState<'idle' | 'countdown' | 'claimed'>('idle');
  const [luckyBoxTimeRemaining, setLuckyBoxTimeRemaining] = useState<number>(0);
  const [luckyBudgetPeriod, setLuckyBudgetPeriod] = useState<'daily' | 'weekly'>('daily');
  const [luckyBudgetCoins, setLuckyBudgetCoins] = useState<number>(5000);

  // Visibility Budget States
  const [visibilityCoins, setVisibilityCoins] = useState(10000);
  const [visibilityPKs, setVisibilityPKs] = useState(3);
  const [visibilityBoxes, setVisibilityBoxes] = useState(1);
  const [calculatedVisibility, setCalculatedVisibility] = useState<any | null>(null);

  // GC Announcements Hub States
  const [gcActiveTab, setGcActiveTab] = useState<'no-stream' | 'pre-stream' | 'post-stream'>('no-stream');
  
  // No-Stream settings
  const [noStreamReason, setNoStreamReason] = useState<'sick' | 'family' | 'travel' | 'recharge'>('sick');
  const [noStreamDate, setNoStreamDate] = useState('');
  const [noStreamReturnDate, setNoStreamReturnDate] = useState('');
  const [generatedNoStreamText, setGeneratedNoStreamText] = useState('');
  
  // Pre-Stream Settings
  const [preStreamTheme, setPreStreamTheme] = useState('Vocal Requests & Cozy Chats');
  const [preStreamTime, setPreStreamTime] = useState('8:00 PM EST');
  const [preStreamGoal, setPreStreamGoal] = useState('Unlock the level 3 Lucky Box');
  const [generatedPreStreamText, setGeneratedPreStreamText] = useState('');

  // Post-Stream Settings
  const [postStreamCoins, setPostStreamCoins] = useState('45,000');
  const [postStreamDonors, setPostStreamDonors] = useState('Alex, Sarah, Mark');
  const [postStreamNote, setPostStreamNote] = useState('We defended the board 3 times in a row!');
  const [generatedPostStreamText, setGeneratedPostStreamText] = useState('');

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

  // Exam Score logs
  const [examScores, setExamScores] = useState<ExamScore[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nine_examination_scores') || '[]');
    } catch {
      return [];
    }
  });

  // Flashcards States
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  const [shuffledCards, setShuffledCards] = useState(FLASHCARDS);

  // Regenerate bio statement whenever any of the questionnaire answers change
  useEffect(() => {
    if (bioStep === 'questionnaire') {
      const formattedText = `Welcome! I am a **${bioTalent}** and my room vibe is **${bioStyle}**. 💖 Daily live stream starting at **${bioSchedule}**! Join the **${bioTribe}** tribe! ✨`;
      setBioText(formattedText.slice(0, 250));
    }
  }, [bioTalent, bioStyle, bioSchedule, bioTribe, bioStep]);

  // Lucky Box Budget Recommendation logic
  const getLuckyRecommendation = (period: 'daily' | 'weekly', coins: number) => {
    let structure = '';
    let justification = '';
    let condition = '';
    let timer = '5min';
    let PKAdvice = '';

    if (coins <= 0) {
      structure = 'No coins budgeted';
      condition = 'All audiences';
      justification = 'Please input a budget to see suggestions.';
      PKAdvice = 'Investing even a small amount helps with discovery.';
    } else if (coins < 1000) {
      structure = `${period === 'daily' ? '1 drop' : '2 drops'} of 100 Coins (Even Split, 10 Winners)`;
      condition = 'Follow the host';
      justification = 'Low budget starter drop to quickly inflate follower count and trigger search rankings.';
      PKAdvice = 'Use when starting your live stream to greet newcomers.';
    } else if (coins < 10000) {
      const drops = period === 'daily' ? 2 : 5;
      const amount = Math.floor(coins / drops);
      structure = `${drops} drops of ${amount} Coins (Even Split, 50 Winners)`;
      condition = 'Follow the host';
      justification = 'Mid-tier budget plan to trigger organic discovery. Broad splits invite high-volume clicking.';
      PKAdvice = 'Deploy drops exactly 2 minutes before entering a co-host or Random PK match.';
    } else if (coins < 50000) {
      const drops = period === 'daily' ? 3 : 8;
      const amount = Math.floor(coins / drops);
      structure = `${drops} drops of ${amount.toLocaleString()} Coins (Lucky Draw, 5-10 Winners)`;
      condition = 'Join Fan Club';
      justification = 'High-traffic conversion plan. Fanclub requirements filter transient scrolling accounts and lock in committed tribe members.';
      PKAdvice = 'Deploy 1 box at the start of your hour, and another right before a high-stakes PK.';
    } else {
      const drops = period === 'daily' ? 5 : 12;
      const amount = Math.floor(coins / drops);
      structure = `${drops} drops of ${amount.toLocaleString()} Coins (Lucky Draw, 10 Winners)`;
      condition = 'Join Fan Club';
      justification = 'Whale attraction plan. Large chest sizes appeal to VIP users looking to farm coins, converting them into active supporters.';
      PKAdvice = 'Always sync boxes with multi-host PK rooms for maximum algorithm multiplier exposure.';
    }

    return { structure, condition, justification, timer, PKAdvice };
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

  // Lucky Box Countdown Timer simulation
  useEffect(() => {
    let timerId: any;
    if (luckyBoxSimStatus === 'countdown' && luckyBoxTimeRemaining > 0) {
      timerId = setInterval(() => {
        setLuckyBoxTimeRemaining(prev => {
          if (prev <= 1) {
            setLuckyBoxSimStatus('claimed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [luckyBoxSimStatus, luckyBoxTimeRemaining]);

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

  // Generate Announcements GC Copy-paste texts
  useEffect(() => {
    // 1. No Stream Announcement
    const dateStr = noStreamDate ? new Date(noStreamDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'today';
    const returnStr = noStreamReturnDate ? new Date(noStreamReturnDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'our next scheduled slot';
    let absenceReason = '';
    if (noStreamReason === 'sick') absenceReason = 'feeling under the weather and need to rest my voice';
    else if (noStreamReason === 'family') absenceReason = 'handling an urgent family commitment';
    else if (noStreamReason === 'travel') absenceReason = 'traveling and will have limited network signal';
    else absenceReason = 'taking a creative rest day to recharge my energy';

    setGeneratedNoStreamText(`🚨 STREAM ABSENCE NOTICE 🚨\n\nHey family! Unfortunately, I won't be able to go live on ${dateStr} because I am ${absenceReason}. 🤒\n\nI want to make sure I bring 100% energy to our room! I'll be taking tonight off to recover and see you all back on ${returnStr}. Thank you so much for understanding. Please stay safe and healthy! ❤️✨`);

    // 2. Pre-Stream Announcement
    setGeneratedPreStreamText(`🔔 GOING LIVE SOON! 🔔\n\nHey tribe! We are launching in 15 minutes! 🚀\n\n🎤 Vibe Tonight: **${preStreamTheme}**\n⏰ Start Time: **${preStreamTime}**\n🏆 Today's Mission: **${preStreamGoal}**\n\nClick the link, grab your seats, and let's conquer the leaderboard together! See you in a bit! 💖✨`);

    // 3. Post-Stream Announcement
    setGeneratedPostStreamText(`💖 STREAM RETROSPECTIVE 💖\n\nThank you all for an incredible stream tonight! Together, we raised **${postStreamCoins}** points! 🎉\n\n🏆 Special MVP Shoutouts: **${postStreamDonors}**\n📝 Note: ${postStreamNote}\n\nI appreciate the endless love and support, team. Rest up, and see you all in the next schedule! Goodnight! 💤✨`);

  }, [
    noStreamReason, noStreamDate, noStreamReturnDate,
    preStreamTheme, preStreamTime, preStreamGoal,
    postStreamCoins, postStreamDonors, postStreamNote
  ]);

  // Copy Update Helper
  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
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

  // Quizzes list data (3 Category Exams: Foundations, Growth, Mastery)
  const quizzes: Quiz[] = [
    {
      level: 'foundations',
      title: 'Category A: Foundations Exam (Pillars 1-3)',
      questions: [
        {
          question: 'What is the "Digital Handshake" goal in Profile Optimization (Pillar 1)?',
          options: [
            'Forcing viewers to immediately purchase coins.',
            'Establishing visual trust and viewer interest within 3 seconds.',
            'Getting signed to a head agency contract.',
            'Setting up a community group chat with 100 people.'
          ],
          correctAnswer: 1,
          explanation: 'Profile Optimization acts as your digital billboard. The visual elements must establish cognitive fluency and trust within 3 seconds.'
        },
        {
          question: 'Which hardware element is considered the #1 priority for psychological comfort (Pillar 2)?',
          options: [
            'High-end DSLR video capture setup.',
            'A professional ring light with adjustable colors.',
            'Audio quality (Microphone clarity / lack of background noise).',
            'Advanced screen green screen software.'
          ],
          correctAnswer: 2,
          explanation: 'Audio quality is #1. Viewers will tolerate average video, but bad, noisy, or distorted audio will drive them away instantly.'
        },
        {
          question: 'What does "Nametag Cognitive Fluency" mean (Pillar 1)?',
          options: [
            'Having multiple emojis and special characters to look fancy.',
            'A name that is simple, pronounceable, search-friendly, and easy to memorize.',
            'Protecting your privacy by using random number strings.',
            'Translating your username into three different languages.'
          ],
          correctAnswer: 1,
          explanation: 'Nametags should avoid complex punctuation, symbols, and random numbers so that they are highly readable and easy to call out.'
        },
        {
          question: 'How should you communicate a schedule shift or emergency absence to your audience (Pillar 3)?',
          options: [
            'Remain silent and disappear to build mystery.',
            'Post a detailed update in the Fanclub GC at least 2 hours before the scheduled slot.',
            'Contact only your manager and leave the room offline.',
            'Start a stream, turn off your video, and keep silent.'
          ],
          correctAnswer: 1,
          explanation: 'Consistency builds habits. In case of an emergency, write an update containing the date of absence, reason, and return date.'
        },
        {
          question: 'In profile optimization, what is the "Halo Effect" (Pillar 1)?',
          options: [
            'The visual trust created by a warm, friendly solo cover photo.',
            'The ring light reflection visible in the host\'s eyes.',
            'A special shiny frame earned by ranking on the leaderboard.',
            'Streaming only in a room with a white circular background.'
          ],
          correctAnswer: 0,
          explanation: 'A warm, friendly, solo cover photo creates psychological comfort and trust (the Halo Effect) compared to blurry, off-center, or group photos.'
        }
      ]
    },
    {
      level: 'growth',
      title: 'Category B: Growth Exam (Pillars 4-6)',
      questions: [
        {
          question: 'What is the algorithmic purpose of dropping a Lucky Box (Pillar 4)?',
          options: [
            'To spend excess coins to reduce tax penalties.',
            'To draw in crowd traffic to spike room metrics and algorithmic traction.',
            'To automatically earn coins back from the platform.',
            'To verify if the stream network connection is stable.'
          ],
          correctAnswer: 1,
          explanation: 'Lucky Boxes draw in audience traffic, which spikes active room counts and algorithmic discovery.'
        },
        {
          question: 'How do you prevent "Dead Air" when there are no active comments (Pillar 5)?',
          options: [
            'Remain silent and look at your phone until someone chats.',
            'Play background music at maximum volume to block the silence.',
            'Speak continuously (storytelling, reciting goals, describing ambient room details).',
            'Shut down the stream immediately and retry later.'
          ],
          correctAnswer: 2,
          explanation: 'Dead air kills viewer retention. Dynamic hosts maintain a continuous flow of commentary, reading names, and asking questions.'
        },
        {
          question: 'What is the correct synchronization for a Lucky Box drop and a Random PK (Pillar 4)?',
          options: [
            'Deploy the Lucky Box exactly 2 minutes before launching the Random PK.',
            'Drop the Lucky Box right after the Random PK has ended.',
            'Deploy the Lucky Box only during silent, off-peak hours.',
            'Lucky Boxes and Random PKs should never be done in the same hour.'
          ],
          correctAnswer: 0,
          explanation: 'Deploying a Lucky Box 2 minutes before a PK pulls in traffic, maximizing your active viewer count just as the PK begins and metrics are evaluated.'
        },
        {
          question: 'In fanbase development, what is the main goal of the Fanclub (Pillar 6)?',
          options: [
            'Allowing other hosts to moderate your room.',
            'Building tribe identity, custom badges, and rules to turn followers into committed members.',
            'Receiving coin incentives directly from the platform.',
            'Arranging meetings with managers outside the application.'
          ],
          correctAnswer: 1,
          explanation: 'A Fanclub provides exclusive perks and prestige, forming a dedicated community tribe that defends your board.'
        },
        {
          question: 'When a new, silent viewer enters your room, how should you greet them (Pillar 5)?',
          options: [
            'Demand they send a gift or leave the room.',
            'Ignore them completely until they write something in chat.',
            'Ask an open-ended question that connects their username to an engaging topic.',
            'Immediately flag them as spam to keep the chat clean.'
          ],
          correctAnswer: 2,
          explanation: 'Personalized open-ended greetings help viewers feel seen and welcome, prompting them to start chatting.'
        }
      ]
    },
    {
      level: 'mastery',
      title: 'Category C: Mastery Exam (Pillars 7-9)',
      questions: [
        {
          question: 'How do you maintain "Emotional Continuity" outside live hours (Pillar 7)?',
          options: [
            'Post schedules, highlights, and check in on regulars in the Fanclub GC.',
            'Ignore viewers completely until you go live again.',
            'Request personal donations through private messaging channels.',
            'Share private family details with all scrolling visitors.'
          ],
          correctAnswer: 0,
          explanation: 'Emotional continuity builds relationships and retention between broadcasts through group chats and offline community engagement.'
        },
        {
          question: 'What are the three steps of a professional "Gratitude Loop" (Pillar 8)?',
          options: [
            'Greeting, thanking, and telling them to donate more.',
            'Emotional validation (surprise), action cue (sound effect/dance), and prestige marker (name on board).',
            'Sending coins back, muting the sender, and resetting goals.',
            'Muting the microphone, playing a song, and ignoring the notification.'
          ],
          correctAnswer: 1,
          explanation: 'A gratitude loop validates donor support, encouraging recurring gifting through intense positive reinforcement.'
        },
        {
          question: 'Which of the following describes the "Four Goal Arches" in Intentional Goal Setting (Pillar 9)?',
          options: [
            'Stream time, follower count, PK victories, and total gifts.',
            'Financial (Earnings), Audience (Community), Skill (Talent), and Infrastructure (Quality).',
            'Morning, afternoon, evening, and night schedules.',
            'Weekly, monthly, quarterly, and annual agency targets.'
          ],
          correctAnswer: 1,
          explanation: 'Balancing goals across the Four Arches ensures sustainable growth without focusing exclusively on earnings or ignoring infrastructure.'
        },
        {
          question: 'Why should you avoid begging or guilt-tripping viewers for coins (Pillar 8)?',
          options: [
            'It violates psychological safety and drives high-value supporters away.',
            'The platform system will automatically deduct 50% of your earnings.',
            'It is actually the fastest way to get certified.',
            'It causes network lag on your streaming device.'
          ],
          correctAnswer: 0,
          explanation: 'Generosity is inspired when supporters share in a positive mission. Begging creates guilt and pressure, which ruins community safety.'
        },
        {
          question: 'What is the correct feedback loop for goal setting (Pillar 9)?',
          options: [
            'Declare goals pre-stream, track progress mid-stream, and review outcomes post-stream.',
            'Allow the agency to set all goals and only check results monthly.',
            'Declare goals only when the room is empty and delete them when people arrive.',
            'Goals should be decided after the stream is already finished.'
          ],
          correctAnswer: 0,
          explanation: 'The feedback loop of Declare -> Track -> Review keeps the host and the chat aligned on a shared daily purpose.'
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
    const isCorrect = selectedOption === correctAnswerIndex;
    const currentQuiz = quizzes.find(q => q.level === selectedQuizLevel);
    if (!currentQuiz) return;

    const updatedScore = isCorrect ? quizScore + 1 : quizScore;
    
    if (currentQuizQuestionIndex < currentQuiz.questions.length - 1) {
      setQuizScore(updatedScore);
      setCurrentQuizQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // Finished the quiz!
      const totalQ = currentQuiz.questions.length;
      const passed = updatedScore === totalQ; // Must score 100% to pass

      // Save score log in array
      const scoreEntry: ExamScore = {
        category: selectedQuizLevel || 'unknown',
        score: updatedScore,
        total: totalQ,
        passed,
        timestamp: new Date().toLocaleString()
      };

      const newHistory = [scoreEntry, ...examScores];
      setExamScores(newHistory);
      localStorage.setItem('nine_examination_scores', JSON.stringify(newHistory));

      if (passed) {
        const updatedCert = { ...quizResultsHistory, [selectedQuizLevel || '']: true };
        setQuizResultsHistory(updatedCert);
        localStorage.setItem('nine_certification_status', JSON.stringify(updatedCert));
      }
      
      setQuizScore(updatedScore);
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
      tools: ['Bio Builder', 'Name Readability Test'],
      drills: [
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
      tools: ['Audio Test Lab', 'Name Readability Test', 'Background Cleanliness Score'],
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
      tools: ['Schedule Builder', 'Consistency Tracker', 'GC Announcements Hub'],
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
      tools: ['Lucky Box Setup Simulator', 'Visibility Budget Calculator', 'PK Strategy Simulator'],
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
      tools: ['GC Announcements Hub', 'Retention Calendar', 'Milestone Tracker'],
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
              onClick={() => setActiveTab('onboarding')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'onboarding'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-white/5 bg-[#1A1A28] text-[#A09E9A] hover:text-[#F0EFE8] hover:border-white/10'
              }`}
            >
              Onboarding 101
            </button>
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
          {/* ==================== TAB: ONBOARDING 101 ==================== */}
          {activeTab === 'onboarding' && (
            <div className="space-y-6">
              {/* Persona Switcher & Header */}
              <div className="glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#D4AF37]/10 bg-[#1A1A28] p-5">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="text-[#D4AF37] animate-pulse" size={18} />
                    <span>Quick Start Onboarding</span>
                  </h2>
                  <p className="text-xs text-[#A09E9A] mt-1">Get certified for your role through simulated exercises.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0D0D14] border border-white/5 rounded-xl p-1">
                  <button
                    onClick={() => setPersona('host')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      persona === 'host' ? 'bg-[#D4AF37] text-[#0D0D14]' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                    }`}
                  >
                    <User size={13} />
                    <span>Streaming 101</span>
                  </button>
                  <button
                    onClick={() => setPersona('manager')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      persona === 'manager' ? 'bg-purple-600 text-white' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                    }`}
                  >
                    <Users size={13} />
                    <span>Managing 101</span>
                  </button>
                </div>
              </div>

              {persona === 'host' ? (
                /* ================= STREAMING 101 (HOSTS) ================= */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Onboarding Roadmap & Pre-stream Checklist */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Roadmap Card */}
                    <div className="glass-card flex flex-col gap-4">
                      <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">STREAMER ROADMAP</span>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-black flex items-center justify-center mt-0.5">1</div>
                          <div>
                            <p className="text-xs font-black text-white uppercase">Profile Optimization</p>
                             <p className="text-[10px] text-[#A09E9A] mt-0.5">Use Name Readability Test & Bio Builder in Practice Labs.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className={`w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center mt-0.5 ${onboardStreamReady ? 'bg-[#D4AF37]' : 'bg-white/10 text-[#A09E9A]'}`}>2</div>
                          <div>
                            <p className="text-xs font-black text-white uppercase">Pre-Stream Checklist</p>
                            <p className="text-[10px] text-[#A09E9A] mt-0.5">Verify audio, lighting, schedules, and goals below.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className={`w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center mt-0.5 ${pkArenaResult === 'win' ? 'bg-[#D4AF37]' : 'bg-white/10 text-[#A09E9A]'}`}>3</div>
                          <div>
                            <p className="text-xs font-black text-white uppercase">Mock PK Victory</p>
                            <p className="text-[10px] text-[#A09E9A] mt-0.5">Complete a simulated PK battle and beat your co-host.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pre-stream Checklist */}
                    <div className="glass-card flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Pre-Stream Check ({onboardCheckedCount}/4)</span>
                        {onboardStreamReady && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">VERIFIED READY</span>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Audio Check */}
                        <div className="space-y-2">
                          <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                            <span className="text-white">1. Audio Input Sweep</span>
                            <input
                              type="checkbox"
                              checked={onboardAudioChecked}
                              onChange={(e) => {
                                setOnboardAudioChecked(e.target.checked);
                                if (e.target.checked && onboardAudioVolume === 0) setOnboardAudioVolume(55);
                              }}
                              className="accent-[#D4AF37]"
                            />
                          </label>
                          {onboardAudioChecked && (
                            <div className="space-y-1 bg-[#0D0D14] p-2.5 rounded-xl border border-white/5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#A09E9A]">Volume Level (dB)</span>
                                <span className={onboardAudioVolume >= 40 && onboardAudioVolume <= 70 ? 'text-[#D4AF37]' : 'text-red-400'}>
                                  {onboardAudioVolume} {onboardAudioVolume >= 40 && onboardAudioVolume <= 70 ? '(Optimal)' : '(Adjust slider)'}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={onboardAudioVolume}
                                onChange={(e) => setOnboardAudioVolume(Number(e.target.value))}
                                className="w-full accent-[#D4AF37]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Lighting Check */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-white">2. Ring Light Intensity</span>
                            <span className={onboardLightingValue >= 75 ? 'text-cyan-400' : 'text-[#A09E9A]'}>
                              {onboardLightingValue}% {onboardLightingValue >= 75 ? '(Excellent)' : '(Too dark)'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={onboardLightingValue}
                            onChange={(e) => setOnboardLightingValue(Number(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>

                        {/* Notice Checkbox */}
                        <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                          <span className="text-white">3. Posted Live announcement</span>
                          <input
                            type="checkbox"
                            checked={onboardNoticePosted}
                            onChange={(e) => setOnboardNoticePosted(e.target.checked)}
                            className="accent-[#D4AF37]"
                          />
                        </label>

                        {/* Goal widget check */}
                        <div className="space-y-2">
                          <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                            <span className="text-white">4. Declared Daily Goal</span>
                            <input
                              type="checkbox"
                              checked={onboardGoalDeclared}
                              onChange={(e) => setOnboardGoalDeclared(e.target.checked)}
                              className="accent-[#D4AF37]"
                            />
                          </label>
                          {onboardGoalDeclared && (
                            <input
                              type="text"
                              value={onboardGoalText}
                              onChange={(e) => setOnboardGoalText(e.target.value)}
                              placeholder="e.g. Upgrade microphone for audio comfort..."
                              className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                          )}
                        </div>
                      </div>

                      <button
                        disabled={onboardCheckedCount < 4 || onboardStreamReady}
                        onClick={() => {
                          setOnboardStreamReady(true);
                          Storage.addNotification({
                            title: 'Stream Verified Ready',
                            message: 'Onboarding checklist completed! Your hardware and goals are fully Pillar-compliant.',
                            type: 'success'
                          });
                        }}
                        className={`w-full py-2.5 text-center text-xs font-black uppercase rounded-xl transition-all ${
                          onboardCheckedCount === 4 && !onboardStreamReady
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-black font-bold shadow-[0_2px_12px_rgba(212,175,55,0.2)]'
                            : 'bg-white/5 text-[#5A5865] cursor-not-allowed border border-white/5'
                        }`}
                      >
                        {onboardStreamReady ? 'Verification Complete' : 'Verify Stream-Ready'}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Mock PK Arena game */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="glass-card flex-1 flex flex-col gap-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-48 h-48 bg-radial from-[#D4AF37]/5 to-transparent blur-3xl pointer-events-none" />

                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Flame className="text-[#D4AF37]" size={16} />
                          <span className="text-xs font-black text-white uppercase tracking-wider">Pillar 4: Mock PK Arena</span>
                        </div>
                        {pkArenaActive && (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[8px] font-black tracking-widest animate-pulse">
                            TIME LEFT: {pkArenaTimer}S
                          </span>
                        )}
                      </div>

                      {!pkArenaActive ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-center p-8 gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-red-950/20 border border-red-500/20 flex items-center justify-center text-3xl">⚔️</div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Practice PK Match Drills</h3>
                            <p className="text-xs text-[#A09E9A] mt-2 max-w-sm leading-relaxed">
                              Experience a live competitive match. Gain points by deploying Gratitude Loops, Call-to-Actions, and Double Booster Boxes to defend your board!
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPkArenaActive(true);
                              setPkArenaTimer(30);
                              setPkHostPoints(10000);
                              setPkOpponentPoints(9500);
                              setPkArenaLog(['PK Battle started! Opponent matching details loaded...', 'You entered with 10,000 points.']);
                              setPkArenaResult(null);
                            }}
                            className="btn-gold px-6 py-2.5 text-xs font-black uppercase"
                          >
                            Enter Arena
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col gap-4">
                          {/* Split screen stream simulator */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left: You */}
                            <div className="bg-[#0D0D14] rounded-2xl border border-[#D4AF37]/20 p-3 flex flex-col justify-between aspect-video relative">
                              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[8px] font-bold text-[#D4AF37]">YOU</span>
                              <div className="flex flex-col items-center justify-center flex-1">
                                <span className="text-3xl">👩‍🎤</span>
                              </div>
                              <div className="w-full text-center mt-2">
                                <p className="text-[10px] text-[#A09E9A] uppercase">Your Points</p>
                                <p className="text-sm font-black text-[#D4AF37]">{pkHostPoints.toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Right: Opponent */}
                            <div className="bg-[#0D0D14] rounded-2xl border border-red-500/10 p-3 flex flex-col justify-between aspect-video relative">
                              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[8px] font-bold text-red-400">OPPONENT</span>
                              <div className="flex flex-col items-center justify-center flex-1">
                                <span className="text-3xl">🧝‍♀️</span>
                              </div>
                              <div className="w-full text-center mt-2">
                                <p className="text-[10px] text-[#A09E9A] uppercase">Their Points</p>
                                <p className="text-sm font-black text-red-400">{pkOpponentPoints.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Points bar comparison slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black text-[#A09E9A]">
                              <span>YOU ({(pkHostPoints / (pkHostPoints + pkOpponentPoints) * 100).toFixed(0)}%)</span>
                              <span>OPPONENT ({(pkOpponentPoints / (pkHostPoints + pkOpponentPoints) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-3 bg-red-950/20 rounded-full overflow-hidden flex">
                              <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E8C44A]" style={{ width: `${(pkHostPoints / (pkHostPoints + pkOpponentPoints) * 100)}%` }} />
                              <div className="h-full bg-red-600" style={{ width: `${(pkOpponentPoints / (pkHostPoints + pkOpponentPoints) * 100)}%` }} />
                            </div>
                          </div>

                          {/* Gameplay console log */}
                          <div className="bg-[#0D0D14] border border-white/5 rounded-2xl p-3 h-24 overflow-y-auto custom-scrollbar font-mono text-[9px] text-[#A09E9A] space-y-1 flex flex-col justify-end">
                            {pkArenaLog.slice(0, 3).map((log, i) => (
                              <p key={i}>{log}</p>
                            ))}
                          </div>

                          {/* Action controls */}
                          {!pkArenaResult ? (
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => handlePkAction('gratitude')}
                                className="px-2 py-2 bg-[#1A1A28] border border-white/5 hover:border-[#D4AF37]/30 rounded-xl text-[9px] font-bold text-white transition-all cursor-pointer"
                              >
                                Gratitude Loop
                              </button>
                              <button
                                onClick={() => handlePkAction('cta')}
                                className="px-2 py-2 bg-[#1A1A28] border border-white/5 hover:border-cyan-500/30 rounded-xl text-[9px] font-bold text-white transition-all cursor-pointer"
                              >
                                Follow CTA
                              </button>
                              <button
                                onClick={() => handlePkAction('double')}
                                className="px-2 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/25 rounded-xl text-[9px] font-bold text-[#D4AF37] transition-all cursor-pointer"
                              >
                                Double Booster Box
                              </button>
                            </div>
                          ) : (
                            /* Victory/defeat state */
                            <div className="text-center py-4 space-y-4">
                              <div>
                                <h3 className={`text-base font-black uppercase tracking-wider ${pkArenaResult === 'win' ? 'text-[#D4AF37]' : 'text-red-400'}`}>
                                  {pkArenaResult === 'win' ? '🏆 Victory! You Defended the Board!' : '❌ Match Defeat! Opponent Outscored You'}
                                </h3>
                                <p className="text-[10px] text-[#A09E9A] mt-1">
                                  Final Score: {pkHostPoints.toLocaleString()} vs {pkOpponentPoints.toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={resetPkArena}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                              >
                                {pkArenaResult === 'win' ? 'Compete Again' : 'Retry Drill'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= MANAGING 101 (MANAGERS) ================= */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Manager Roadmap & Checklist */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="glass-card flex flex-col gap-4">
                      <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">MANAGER ROADMAP</span>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className={`w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center mt-0.5 ${auditFinished ? 'bg-purple-600 text-white' : 'bg-white/10 text-[#A09E9A]'}`}>1</div>
                          <div>
                            <p className="text-xs font-black text-white uppercase">Compliance Audit Sandbox</p>
                            <p className="text-[10px] text-[#A09E9A] mt-0.5">Audit host submissions and flag violations.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className={`w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center mt-0.5 ${roleplayFinished ? 'bg-purple-600 text-white' : 'bg-white/10 text-[#A09E9A]'}`}>2</div>
                          <div>
                            <p className="text-xs font-black text-white uppercase">Coaching Roleplay</p>
                            <p className="text-[10px] text-[#A09E9A] mt-0.5">Guide discouraged or underperforming hosts.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card flex flex-col gap-2.5">
                      <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">MANAGEMENT GUIDELINES</span>
                      <p className="text-xs text-[#A09E9A] leading-relaxed">
                        Managers teach and enforce the 9 Pillars. Set up checks for background noise, approve cover photos, and support monetization frameworks. Always coach with micro-goals and empathy.
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Compliance Audit Sandbox */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="glass-card flex-1 flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Shield className="text-purple-400" size={16} />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Compliance Audit Sandbox</span>
                      </div>

                      {!auditFinished ? (
                        <div className="flex-1 flex flex-col gap-4">
                          <div className="bg-[#0D0D14] border border-white/5 p-3.5 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[#A09E9A]">Profile Submission #{auditProfileIdx + 1}</span>
                              <span className="text-purple-400 font-bold">Pending Review</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-white font-bold">Nickname: {auditProfiles[auditProfileIdx].name}</p>
                              <p className="text-[11px] text-[#A09E9A]">Cover Photo: {auditProfiles[auditProfileIdx].cover}</p>
                              <p className="text-[11px] text-[#A09E9A] italic">Bio: "{auditProfiles[auditProfileIdx].bio}"</p>
                            </div>
                          </div>

                          {!auditFeedback ? (
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                              <button
                                onClick={() => handleAuditAction(true)}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer text-center"
                              >
                                Approve Profile
                              </button>
                              <button
                                onClick={() => handleAuditAction(false)}
                                className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer text-center"
                              >
                                Reject Profile
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 mt-auto">
                              <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-purple-500 pl-3">
                                {auditFeedback}
                              </p>
                              <button
                                onClick={handleNextAudit}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-pointer text-center"
                              >
                                Next Submission
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-col flex items-center justify-center text-center p-8 gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#D4AF37] text-2xl">🏆</div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase">Audit Training Completed</h3>
                            <p className="text-xs text-[#A09E9A] mt-2">
                              Your compliance score: {auditScore} points
                            </p>
                          </div>
                          <button
                            onClick={resetAudit}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            Retry Sandbox
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Coaching Roleplay */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="glass-card flex-1 flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Users className="text-purple-400" size={16} />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Coaching Roleplay Simulator</span>
                      </div>

                      {!roleplayFinished ? (
                        <div className="flex-1 flex flex-col gap-4">
                          <div className="bg-[#0D0D14] border border-white/5 p-3.5 rounded-2xl space-y-3">
                            <span className="text-[10px] text-[#A09E9A] block uppercase font-bold">Scenario: {coachingScenarios[roleplayScenarioIdx].title}</span>
                            <p className="text-xs text-white leading-relaxed font-semibold">
                              {coachingScenarios[roleplayScenarioIdx].desc}
                            </p>
                          </div>

                          {!roleplayChoiceFeedback ? (
                            <div className="flex flex-col gap-2 mt-auto">
                              {coachingScenarios[roleplayScenarioIdx].options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => handleRoleplayChoice(oIdx)}
                                  className="w-full text-left p-3 rounded-xl bg-[#0D0D14] hover:bg-[#13131E] border border-white/5 hover:border-purple-500/30 text-xs font-semibold text-[#A09E9A] hover:text-white transition-all"
                                >
                                  {opt.text}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-4 mt-auto">
                              <p className="text-xs text-[#A09E9A] leading-relaxed border-l-2 border-[#D4AF37] pl-3">
                                {roleplayChoiceFeedback}
                              </p>
                              <button
                                onClick={handleNextRoleplay}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-pointer text-center"
                              >
                                Next Scenario
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-col flex items-center justify-center text-center p-8 gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-emerald-400 text-2xl">🏆</div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase">Coaching Certification Completed</h3>
                            <p className="text-xs text-[#A09E9A] mt-2">
                              Your coaching scorecard: {roleplayScore} points
                            </p>
                          </div>
                          <button
                            onClick={resetRoleplay}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            Retry Roleplay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                    {[
                      { id: 'foundations', label: 'Foundations (Cat A)' },
                      { id: 'growth', label: 'Growth (Cat B)' },
                      { id: 'mastery', label: 'Mastery (Cat C)' }
                    ].map((cert) => {
                      const completed = quizResultsHistory[cert.id];
                      return (
                        <div key={cert.id} className={`flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 transition-all ${completed ? '' : 'opacity-50'}`}>
                          <Trophy size={16} className={completed ? 'text-[#D4AF37]' : 'text-[#A09E9A]'} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{cert.label}</p>
                            <p className="text-[9px] text-[#A09E9A]">{completed ? 'Unlocked / Certified' : 'Locked (Take Exam)'}</p>
                          </div>
                          {completed ? (
                            <button 
                              onClick={() => setViewingCertificate(cert.id)}
                              className="text-[10px] font-bold text-[#D4AF37] hover:underline shrink-0 cursor-pointer"
                            >
                              View
                            </button>
                          ) : (
                            <button 
                              onClick={() => setActiveTab('certifications')}
                              className="text-[10px] font-bold text-[#A09E9A] hover:text-[#F0EFE8] shrink-0 cursor-pointer"
                            >
                              Unlock
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#D4AF37]" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">AI Coach Alert</span>
                  </div>
                  <p className="text-xs text-[#A09E9A] leading-relaxed">
                    "Your profile optimization audit is pending feedback. Let's make sure your Bio matches the Pillars by generating it in the Bio Builder."
                  </p>
                  <button
                    onClick={() => { setActiveTab('labs'); setActiveLabTool('bio-builder'); }}
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
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Playable tools: Bio Builder wizard, Lucky Box simulator, GC Announcements Hub, and reaction speed game.</p>
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
                        <p className="text-[11px] text-[#A09E9A] mt-1 leading-relaxed">Complete the Foundations, Growth, and Mastery Category Exams. Unlocks official certifications and agency spotlights.</p>
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
                      className="px-3 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer"
                    >
                      Study 9 Pillars
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ==================== TAB: 9 PILLARS CURRICULUM ==================== */}
          {activeTab === 'pillars' && (() => {
            const handlePrevFlashcard = () => {
              setIsFlashcardFlipped(false);
              if (currentFlashcardIndex > 0) {
                setCurrentFlashcardIndex(prev => prev - 1);
              }
            };
            const handleNextFlashcard = () => {
              setIsFlashcardFlipped(false);
              if (currentFlashcardIndex < shuffledCards.length - 1) {
                setCurrentFlashcardIndex(prev => prev + 1);
              }
            };
            const shuffleFlashcards = () => {
              setIsFlashcardFlipped(false);
              const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
              setShuffledCards(shuffled);
              setCurrentFlashcardIndex(0);
            };
            const resetFlashcards = () => {
              setIsFlashcardFlipped(false);
              setShuffledCards(FLASHCARDS);
              setCurrentFlashcardIndex(0);
            };

            return (
              <div className="space-y-6">
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
                                    const lower = t.toLowerCase();
                                    if (lower.includes('photo')) setActiveLabTool('bio-builder');
                                    else if (lower.includes('bio')) setActiveLabTool('bio-builder');
                                    else if (lower.includes('readability')) setActiveLabTool('name-readability');
                                    else if (lower.includes('lucky')) setActiveLabTool('lucky-box');
                                    else if (lower.includes('budget')) setActiveLabTool('visibility-budget');
                                    else if (lower.includes('update') || lower.includes('announcement') || lower.includes('gc')) setActiveLabTool('gc-announcements');
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

                {/* ==================== Flashcard Study Room ==================== */}
                <div className="glass-card bg-[#13131E] border border-[#D4AF37]/20 relative overflow-hidden p-6 sm:p-8 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-radial from-[#D4AF37]/5 to-transparent blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={18} className="text-[#D4AF37]" />
                        <span>Interactive Flashcard Study Room</span>
                      </h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Practice key concepts from the 9 Pillars to prepare for Category Exams.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={shuffleFlashcards}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#D4AF37]/35 rounded-xl text-[10px] font-bold text-white transition-all flex items-center gap-1"
                      >
                        <RefreshCw size={11} />
                        <span>Shuffle</span>
                      </button>
                      <button
                        onClick={resetFlashcards}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-white transition-all"
                      >
                        Reset Deck
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Deck Progress Bar */}
                    <div className="w-full space-y-1.5 max-w-xl mx-auto">
                      <div className="flex justify-between text-[10px] font-black text-[#A09E9A] uppercase tracking-wider">
                        <span>Progress</span>
                        <span>Card {currentFlashcardIndex + 1} of {shuffledCards.length}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8960C] transition-all duration-300"
                          style={{ width: `${((currentFlashcardIndex + 1) / shuffledCards.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Flipping Card container */}
                    <div 
                      className="w-full max-w-xl mx-auto h-60 cursor-pointer relative"
                      style={{ perspective: '1000px' }}
                      onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                    >
                      <div 
                        className="w-full h-full relative transition-transform duration-500"
                        style={{ 
                          transformStyle: 'preserve-3d', 
                          transform: isFlashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                        }}
                      >
                        {/* Front Card Face (Question) */}
                        <div 
                          className="absolute inset-0 w-full h-full bg-[#181825] border border-[#D4AF37]/25 rounded-2xl p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">{shuffledCards[currentFlashcardIndex].pillar}</span>
                            <HelpCircle size={14} className="text-[#D4AF37] animate-pulse" />
                          </div>
                          <div className="flex-1 flex items-center justify-center text-center px-4 py-2">
                            <p className="text-sm sm:text-base font-black text-white leading-relaxed uppercase tracking-wide">
                              {shuffledCards[currentFlashcardIndex].question}
                            </p>
                          </div>
                          <div className="text-center text-[9px] text-[#A09E9A] font-bold uppercase tracking-wider bg-white/5 py-1 rounded-lg">
                            👇 Click card to flip and reveal answer
                          </div>
                        </div>

                        {/* Back Card Face (Answer) */}
                        <div 
                          className="absolute inset-0 w-full h-full bg-[#0D0D14] border border-emerald-500/25 rounded-2xl p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                          style={{ 
                            backfaceVisibility: 'hidden', 
                            transform: 'rotateY(180deg)' 
                          }}
                        >
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">{shuffledCards[currentFlashcardIndex].pillar}</span>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          </div>
                          <div className="flex-1 flex items-center justify-center text-center px-4 py-2 overflow-y-auto max-h-[120px] custom-scrollbar">
                            <p className="text-xs sm:text-sm text-[#F0EFE8] leading-relaxed">
                              {shuffledCards[currentFlashcardIndex].answer}
                            </p>
                          </div>
                          <div className="text-center text-[9px] text-[#A09E9A] font-bold uppercase tracking-wider bg-white/5 py-1 rounded-lg">
                            👇 Click card to flip back to question
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-center gap-4 max-w-xl mx-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrevFlashcard(); }}
                        disabled={currentFlashcardIndex === 0}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          currentFlashcardIndex === 0
                            ? 'bg-white/2 text-[#5A5865] cursor-not-allowed border border-white/5'
                            : 'bg-[#1A1A28] border border-white/5 hover:border-white/10 text-[#F0EFE8]'
                        }`}
                      >
                        Prev Card
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNextFlashcard(); }}
                        disabled={currentFlashcardIndex === shuffledCards.length - 1}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          currentFlashcardIndex === shuffledCards.length - 1
                            ? 'bg-white/2 text-[#5A5865] cursor-not-allowed border border-white/5'
                            : 'bg-[#D4AF37] text-black font-bold shadow-[0_2px_12px_rgba(212,175,55,0.2)]'
                        }`}
                      >
                        Next Card
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            );
          })()}

          {/* ==================== TAB: PRACTICE LABS ==================== */}
          {activeTab === 'labs' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Lab Navigation Selector */}
              <div className="glass-card flex flex-col gap-3 h-fit">
                <span className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Practice Tools</span>
                
                <div className="flex flex-col gap-1.5">
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
                    onClick={() => setActiveLabTool('lucky-box')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'lucky-box' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Settings size={14} />
                    <span>Lucky Box Simulator</span>
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
                    onClick={() => setActiveLabTool('gc-announcements')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-xs font-bold flex items-center gap-2.5 ${
                      activeLabTool === 'gc-announcements' ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-transparent border-transparent text-[#A09E9A] hover:bg-white/03'
                    }`}
                  >
                    <Calendar size={14} />
                    <span>GC Announcements Hub</span>
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
                
                {/* 1. BIO BUILDER & PROFILE PREVIEW */}
                {activeLabTool === 'bio-builder' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Bio Builder & Profile Preview</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Answer simple questions to generate a formatted bio (max 250 chars) and see it on your profile.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {bioStep === 'questionnaire' ? (
                          <div className="space-y-4 animate-fadeIn">
                            <span className="text-[10px] font-black text-white tracking-widest uppercase block border-b border-white/5 pb-1">Profile Questionnaire Wizard</span>
                            
                            {/* Choose template */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Or Pre-fill with a Template</label>
                              <div className="flex flex-wrap gap-2">
                                {bioTemplates.map((t, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setBioTalent(t.talent);
                                      setBioStyle(t.style);
                                      setBioSchedule(t.schedule);
                                      setBioTribe(t.tribe);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/35 text-[10px] text-white font-bold transition-all cursor-pointer"
                                  >
                                    {t.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Question 1: Talent */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">1. What is your main talent or streaming focus?</label>
                              <input
                                type="text"
                                value={bioTalent}
                                onChange={(e) => setBioTalent(e.target.value)}
                                placeholder="e.g. Singer, Gamer, Late-Night Chitchat"
                                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                              />
                            </div>

                            {/* Question 2: Style */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">2. Describe your room vibe or streaming style</label>
                              <input
                                type="text"
                                value={bioStyle}
                                onChange={(e) => setBioStyle(e.target.value)}
                                placeholder="e.g. Cozy Cozy Chats, Interactive PK Battles, Live Requests"
                                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                              />
                            </div>

                            {/* Question 3: Schedule */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">3. What is your daily schedule?</label>
                              <input
                                type="text"
                                value={bioSchedule}
                                onChange={(e) => setBioSchedule(e.target.value)}
                                placeholder="e.g. Daily at 9 PM EST, Mon-Fri 6 PM"
                                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                              />
                            </div>

                            {/* Question 4: Tribe */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">4. What is your Tribe / Fan Club name?</label>
                              <input
                                type="text"
                                value={bioTribe}
                                onChange={(e) => setBioTribe(e.target.value)}
                                placeholder="e.g. Luna Family 🌙, Starry Night ✨"
                                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                              />
                            </div>

                            <button
                              onClick={() => setBioStep('generated')}
                              className="w-full py-2.5 text-center text-xs font-black uppercase rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-black font-bold transition-all shadow-[0_2px_12px_rgba(212,175,55,0.2)]"
                            >
                              Generate Bio Statement
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="flex justify-between items-center border-b border-white/5 pb-1">
                              <span className="text-[10px] font-black text-white tracking-widest uppercase">Edit Generated Bio</span>
                              <button
                                onClick={() => setBioStep('questionnaire')}
                                className="text-[10px] font-bold text-[#D4AF37] hover:underline"
                              >
                                Modify Answers
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] text-[#A09E9A]">
                                <span>Copy-Paste Text (Markdown format)</span>
                                <span className={bioText.length > 250 ? 'text-red-400 font-bold' : 'text-[#D4AF37]'}>
                                  {bioText.length} / 250 characters
                                </span>
                              </div>
                              <textarea
                                value={bioText}
                                onChange={(e) => setBioText(e.target.value.slice(0, 250))}
                                placeholder="Edit your bio statement..."
                                className="w-full h-32 bg-[#0D0D14] border border-white/10 rounded-xl p-3 text-xs text-[#F0EFE8] focus:border-[#D4AF37] focus:outline-none resize-none font-mono"
                              />
                              {bioText.length >= 250 && (
                                <p className="text-[10px] text-red-400 font-bold">⚠️ Maximum character limit of 250 reached.</p>
                              )}
                            </div>

                            <button
                              onClick={() => copyToClipboard(bioText)}
                              className="w-full py-2.5 text-center text-xs font-black uppercase rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {copiedStatus ? (
                                <>
                                  <Check size={13} className="text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied Bio!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  <span>Copy Bio Text</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mock Poppo Livestream Frame Overlay */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider block">POPPO MOBILE APP PREVIEW</span>
                        
                        <div className="w-full bg-[#13131E] rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8960C] flex items-center justify-center font-black text-black">
                              {authState.name?.[0]?.toUpperCase() || 'H'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{authState.name || 'Your Name'}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[7px] font-black uppercase">LV 10</span>
                              </div>
                              <span className="text-[9px] text-[#A09E9A] font-mono">ID: {authState.poppo_id || '98765432'}</span>
                            </div>
                          </div>

                          <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-3.5 space-y-2">
                            <span className="text-[8px] font-black text-[#5A5865] uppercase tracking-wider block">Bio Self-Introduction</span>
                            <p className="text-[11px] text-[#F0EFE8] leading-relaxed whitespace-pre-line">
                              {(() => {
                                // Renders bold formatting helper in the HTML overlay preview
                                const text = bioText || 'Welcome to my room!';
                                const parts = text.split(/\*\*([^*]+)\*\*/g);
                                return parts.map((part, i) => {
                                  if (i % 2 === 1) {
                                    return <strong key={i} className="text-[#D4AF37] font-extrabold">{part}</strong>;
                                  }
                                  return part;
                                });
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Cognitive Analysis */}
                        <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                          <span className="text-[10px] font-black text-white uppercase tracking-wider block">COGNITIVE ANALYSIS</span>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[#A09E9A]">Length Count:</span>
                              <p className={`font-bold mt-0.5 ${bioText.length > 250 ? 'text-red-400' : 'text-[#D4AF37]'}`}>
                                {bioText.length} / 250
                              </p>
                            </div>
                            <div>
                              <span className="text-[#A09E9A]">Bold Highlights:</span>
                              <p className={`font-bold mt-0.5 ${bioText.includes('**') ? 'text-emerald-400' : 'text-amber-500'}`}>
                                {bioText.includes('**') ? 'Active (Good)' : 'None (Add bold)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. NAME READABILITY TEST */}
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

                {/* 3. LUCKY BOX SETUP SIMULATOR */}
                {activeLabTool === 'lucky-box' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">Lucky Box Setup Simulator</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Practice setting up a Lucky Box chest with specific prize structures, distribution parameters, and requirements.</p>
                    </div>

                    {/* Lucky Box Budget Planner */}
                    <div className="glass-card bg-[#1A1A28] border border-[#D4AF37]/35 rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-radial from-[#D4AF37]/10 to-transparent blur-2xl pointer-events-none" />
                      <div className="flex items-center gap-3">
                        <Calculator className="text-[#D4AF37]" size={18} />
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Lucky Box Budget Planner</h4>
                          <p className="text-[10px] text-[#A09E9A] mt-0.5 font-bold">Plan daily or weekly coins allocation to recommend optimal chest drops.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center border-b border-white/5 pb-4">
                        {/* Period & Coins inputs */}
                        <div className="space-y-3">
                          <div className="flex gap-1 bg-[#0D0D14] border border-white/5 p-1 rounded-xl">
                            <button
                              onClick={() => setLuckyBudgetPeriod('daily')}
                              className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                luckyBudgetPeriod === 'daily' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                              }`}
                            >
                              Daily
                            </button>
                            <button
                              onClick={() => setLuckyBudgetPeriod('weekly')}
                              className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                luckyBudgetPeriod === 'weekly' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                              }`}
                            >
                              Weekly
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-[#A09E9A] uppercase tracking-wider block font-bold">Coins Allocation Budget</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={luckyBudgetCoins || ''}
                                onChange={(e) => setLuckyBudgetCoins(Math.max(0, Number(e.target.value)))}
                                placeholder="e.g. 5000"
                                className="flex-1 bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {[1000, 5000, 10000, 50000].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => setLuckyBudgetCoins(preset)}
                                  className={`px-2 py-0.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-[9px] font-bold text-white transition-all cursor-pointer`}
                                >
                                  {preset.toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Distribution Plan Recommendations */}
                        <div className="md:col-span-2 p-4 bg-[#0D0D14] border border-white/5 rounded-2xl flex flex-col gap-2">
                          <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">RECOMMENDED PROMOTION STRUCTURE</span>
                          {(() => {
                            const rec = getLuckyRecommendation(luckyBudgetPeriod, luckyBudgetCoins);
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-normal">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-[#A09E9A] uppercase tracking-wider">Recommended drop:</span>
                                  <p className="font-extrabold text-white">{rec.structure}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-[#A09E9A] uppercase tracking-wider">Claim restriction:</span>
                                  <p className="font-extrabold text-[#D4AF37]">{rec.condition}</p>
                                </div>
                                <div className="space-y-0.5 sm:col-span-2 text-[10.5px] text-[#A09E9A] leading-relaxed border-t border-white/5 pt-2">
                                  <strong>Why this?</strong> {rec.justification}
                                  <p className="text-cyan-400 mt-1 font-bold">⚡ PK Synchronization: {rec.PKAdvice}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3.5 rounded-2xl text-[11px] text-[#A09E9A] leading-relaxed flex items-start gap-2.5">
                        <AlertTriangle className="text-[#D4AF37] shrink-0 mt-0.5" size={14} />
                        <div>
                          <strong className="text-white font-black block mb-0.5 uppercase tracking-wider text-[10px]">Why you must invest in Lucky Boxes</strong>
                          Bypassing the slow, passive organic discovery lists is crucial for host growth. Dropping a Lucky Box chest draws active scroll traffic, search ranking points, and room counts. Syncing your chest timer to expire 2 minutes before triggering a co-host or Random PK match ensures you have maximum active viewers ready to defend your board. Doing this is heavily encouraged if you are suffering from low room discoverability!
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {/* Game Type Top Tabs */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">1. Game Type prize structure</label>
                          <div className="grid grid-cols-2 gap-2 bg-[#0D0D14] border border-white/5 rounded-xl p-1">
                            <button
                              onClick={() => { setLuckyGameType('split'); setLuckyWinnersMode('preset'); }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                                luckyGameType === 'split' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                              }`}
                            >
                              Even Split
                            </button>
                            <button
                              onClick={() => { setLuckyGameType('draw'); setLuckyWinnersMode('preset'); }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                                luckyGameType === 'draw' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                              }`}
                            >
                              Lucky Draw
                            </button>
                          </div>
                        </div>

                        {/* Coin Settings (Pool Total) */}
                        <div className="space-y-2">
                          <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">
                            2. Coin Settings (Pool Total): <strong className="text-white">{luckyCoinPool.toLocaleString()} Coins</strong>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {luckyGameType === 'split' ? (
                              [10, 50, 100, 500, 1000].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setLuckyCoinPool(val)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    luckyCoinPool === val ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))
                            ) : (
                              [100, 1000, 10000, 50000, 200000].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setLuckyCoinPool(val)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    luckyCoinPool === val ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                  }`}
                                >
                                  {val.toLocaleString()}
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Distribution Winners Count */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">
                              3. Distribution Amount (Winners): <strong className="text-white">{luckyWinnersMode === 'custom' ? luckyCustomWinners || '0' : luckyWinners} winners</strong>
                            </label>
                            {luckyGameType === 'split' && (
                              <button
                                onClick={() => setLuckyWinnersMode(prev => prev === 'preset' ? 'custom' : 'preset')}
                                className="text-[10px] font-bold text-[#D4AF37] hover:underline"
                              >
                                {luckyWinnersMode === 'preset' ? 'Use Custom Input' : 'Use Quick Select'}
                              </button>
                            )}
                          </div>

                          {luckyWinnersMode === 'preset' ? (
                            <div className="flex flex-wrap gap-2">
                              {luckyGameType === 'split' ? (
                                [5, 10, 50, 100, 200].map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => setLuckyWinners(val)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      luckyWinners === val ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                    }`}
                                  >
                                    {val} gifts
                                  </button>
                                ))
                              ) : (
                                [5, 10].map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => setLuckyWinners(val)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      luckyWinners === val ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                    }`}
                                  >
                                    {val} gifts
                                  </button>
                                ))
                              )}
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={luckyCustomWinners}
                              onChange={(e) => setLuckyCustomWinners(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Type custom winner count (e.g. 25)..."
                              className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                            />
                          )}
                        </div>

                        {/* Participation Conditions */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">4. Participation Conditions</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'all', label: 'All audiences' },
                              { id: 'follow', label: 'Follow the host' },
                              { id: 'fanclub', label: 'Join Fan Club' },
                              { id: 'code', label: 'Send Code' }
                            ].map((cond) => (
                              <button
                                key={cond.id}
                                onClick={() => setLuckyCondition(cond.id as any)}
                                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                  luckyCondition === cond.id ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                }`}
                              >
                                {cond.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Claim Method */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">5. Claim Method</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'grab', label: 'Grab (First-Come, First-Served)' },
                              { id: 'random', label: 'Random (Distributed Chance)' }
                            ].map((method) => (
                              <button
                                key={method.id}
                                onClick={() => setLuckyClaimMethod(method.id as any)}
                                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                  luckyClaimMethod === method.id ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                }`}
                              >
                                {method.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">6. Countdown Timer</label>
                          <div className="flex gap-2">
                            {['3min', '5min', '10min'].map((tVal) => (
                              <button
                                key={tVal}
                                onClick={() => setLuckyTimer(tVal as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex-1 text-center ${
                                  luckyTimer === tVal ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                }`}
                              >
                                {tVal}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Simulated Livestream preview screen */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-4 items-center justify-center">
                        <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider self-start">STREAM SIMULATION MONITOR</span>
                        
                        <div className="w-full max-w-[280px] aspect-[9/16] rounded-3xl border border-white/10 overflow-hidden relative flex flex-col justify-between p-4 bg-[#13131E] shadow-2xl">
                          {/* Live indicator top */}
                          <div className="flex justify-between items-center w-full">
                            <span className="px-2 py-0.5 rounded bg-red-600 text-[8px] font-black text-white uppercase tracking-wider animate-pulse">LIVE</span>
                            <span className="text-[8px] text-white/50 font-bold bg-black/40 px-1.5 py-0.5 rounded-full">👤 2,419</span>
                          </div>

                          {/* Floating Lucky Box Widget in Livestream */}
                          <div className="flex flex-col items-center justify-center flex-1 relative">
                            {luckyBoxSimStatus === 'idle' ? (
                              <div className="flex flex-col items-center gap-2 bg-black/50 p-4 rounded-2xl border border-white/10 text-center max-w-[200px]">
                                <span className="text-4xl">🎁</span>
                                <p className="text-[10px] text-white font-bold uppercase">Ready to drop</p>
                              </div>
                            ) : luckyBoxSimStatus === 'countdown' ? (
                              <div className="flex flex-col items-center gap-2 bg-[#D4AF37]/20 border-2 border-[#D4AF37] p-4 rounded-2xl text-center max-w-[200px] animate-pulse">
                                <span className="text-4xl">🎁</span>
                                <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-wider">Ticking Down...</p>
                                <span className="px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white font-mono">
                                  {Math.floor(luckyBoxTimeRemaining / 60)}:{(luckyBoxTimeRemaining % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 bg-emerald-950/30 border-2 border-emerald-500 p-4 rounded-2xl text-center max-w-[200px] animate-bounce">
                                <span className="text-4xl">💥</span>
                                <p className="text-[10px] text-emerald-400 font-black uppercase">CLAIMED!</p>
                                <p className="text-[8px] text-[#A09E9A] leading-relaxed">
                                  {luckyCoinPool.toLocaleString()} coins distributed to winners!
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Room bottom overlays */}
                          <div className="w-full bg-black/40 backdrop-blur-md rounded-xl p-2.5 text-[8px] text-white/80 space-y-1">
                            <p className="font-bold">Lucky Box: {luckyGameType === 'split' ? 'Even Split' : 'Lucky Draw'}</p>
                            <p className="text-[#A09E9A]">Winners limit: {luckyWinnersMode === 'custom' ? luckyCustomWinners || '0' : luckyWinners} gifts</p>
                            <p className="text-[#A09E9A]">Claim condition: Requirement - <span className="text-yellow-400 font-bold uppercase">{luckyCondition}</span></p>
                            <p className="text-[#A09E9A]">Timer set: {luckyTimer}</p>
                          </div>
                        </div>

                        {luckyBoxSimStatus === 'idle' ? (
                          <button
                            onClick={() => {
                              const duration = luckyTimer === '3min' ? 180 : luckyTimer === '5min' ? 300 : 600;
                              setLuckyBoxTimeRemaining(duration);
                              setLuckyBoxSimStatus('countdown');
                            }}
                            className="w-full py-2 bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-black font-black uppercase tracking-widest rounded-xl text-xs text-center cursor-pointer shadow-lg"
                          >
                            Drop Lucky Box
                          </button>
                        ) : luckyBoxSimStatus === 'countdown' ? (
                          <button
                            onClick={() => setLuckyBoxSimStatus('claimed')}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/5 text-white font-bold rounded-xl text-xs text-center cursor-pointer"
                          >
                            Instantly Open Box
                          </button>
                        ) : (
                          <button
                            onClick={() => setLuckyBoxSimStatus('idle')}
                            className="w-full py-2 bg-[#0D0D14] border border-white/10 text-white font-bold rounded-xl text-xs text-center cursor-pointer"
                          >
                            Reset Simulator
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. VISIBILITY BUDGET CALCULATOR */}
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

                {/* 5. GC ANNOUNCEMENTS HUB */}
                {activeLabTool === 'gc-announcements' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-widest">GC Announcements Hub</h3>
                      <p className="text-xs text-[#A09E9A] mt-1">Generate pre-formatted teaser and update templates to copy and paste to your Fanclub Group Chat.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {/* Tab Selector */}
                        <div className="flex gap-1.5 bg-[#0D0D14] border border-white/5 p-1 rounded-xl">
                          <button
                            onClick={() => setGcActiveTab('no-stream')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                              gcActiveTab === 'no-stream' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                            }`}
                          >
                            No-Stream Notice
                          </button>
                          <button
                            onClick={() => setGcActiveTab('pre-stream')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                              gcActiveTab === 'pre-stream' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                            }`}
                          >
                            Pre-Stream Teaser
                          </button>
                          <button
                            onClick={() => setGcActiveTab('post-stream')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                              gcActiveTab === 'post-stream' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#A09E9A] hover:text-[#F0EFE8]'
                            }`}
                          >
                            Post-Stream Recap
                          </button>
                        </div>

                        {/* Fields based on active tab */}
                        {gcActiveTab === 'no-stream' && (
                          <div className="space-y-3 animate-fadeIn">
                            <span className="text-[10px] font-black text-white tracking-widest uppercase block">Absence Information</span>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Reason for absence</label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'sick', label: 'Illness / Recovery' },
                                  { id: 'family', label: 'Family Commitment' },
                                  { id: 'travel', label: 'Travel / Shift' },
                                  { id: 'recharge', label: 'Creative Recharge' }
                                ].map((r) => (
                                  <button
                                    key={r.id}
                                    onClick={() => setNoStreamReason(r.id as any)}
                                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer ${
                                      noStreamReason === r.id ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0D0D14] border-white/5 text-[#A09E9A]'
                                    }`}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
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
                        )}

                        {gcActiveTab === 'pre-stream' && (
                          <div className="space-y-3 animate-fadeIn">
                            <span className="text-[10px] font-black text-white tracking-widest uppercase block">Teaser Details</span>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Tonight's Stream Theme</label>
                              <input
                                type="text"
                                value={preStreamTheme}
                                onChange={(e) => setPreStreamTheme(e.target.value)}
                                placeholder="e.g. Vocal Requests & Cozy Chats"
                                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Start Time</label>
                                <input
                                  type="text"
                                  value={preStreamTime}
                                  onChange={(e) => setPreStreamTime(e.target.value)}
                                  placeholder="e.g. 9:00 PM EST"
                                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Stream Mission / Target Goal</label>
                                <input
                                  type="text"
                                  value={preStreamGoal}
                                  onChange={(e) => setPreStreamGoal(e.target.value)}
                                  placeholder="e.g. 10k coins PK goal"
                                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {gcActiveTab === 'post-stream' && (
                          <div className="space-y-3 animate-fadeIn">
                            <span className="text-[10px] font-black text-white tracking-widest uppercase block">Recap & Appreciation Data</span>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Total Coins Raised</label>
                                <input
                                  type="text"
                                  value={postStreamCoins}
                                  onChange={(e) => setPostStreamCoins(e.target.value)}
                                  placeholder="e.g. 45,000"
                                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">MVPs / Top Donors</label>
                                <input
                                  type="text"
                                  value={postStreamDonors}
                                  onChange={(e) => setPostStreamDonors(e.target.value)}
                                  placeholder="e.g. Alex, Sarah, Mark"
                                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#A09E9A] uppercase tracking-wider block">Custom Appreciation Note</label>
                              <textarea
                                value={postStreamNote}
                                onChange={(e) => setPostStreamNote(e.target.value)}
                                placeholder="Write a short custom message to your tribe..."
                                className="w-full h-20 bg-[#0D0D14] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Generated Status Text */}
                      <div className="p-5 rounded-2xl bg-[#0D0D14] border border-white/5 flex flex-col gap-3">
                        {(() => {
                          const activeText = 
                            gcActiveTab === 'no-stream' ? generatedNoStreamText :
                            gcActiveTab === 'pre-stream' ? generatedPreStreamText : generatedPostStreamText;

                          return (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-[#5A5865] uppercase tracking-wider">GENERATED CHAT MESSAGE</span>
                                <button
                                  onClick={() => copyToClipboard(activeText)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
                                >
                                  {copiedStatus ? (
                                    <>
                                      <Check size={12} className="text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy Text</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="flex-1 bg-[#13131E] border border-white/5 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-[#A09E9A] whitespace-pre-wrap select-all min-h-[160px] max-h-[200px] overflow-y-auto">
                                {activeText}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. COMMENT RESPONSE SPEED DRILL */}
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
                                    className="px-2 py-1 rounded bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[9px] font-bold text-[#D4AF37] cursor-pointer"
                                  >
                                    Welcome Tag
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'question')}
                                    className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-[9px] font-bold text-cyan-400 cursor-pointer"
                                  >
                                    Answer Ques
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'gift')}
                                    className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[9px] font-bold text-emerald-400 cursor-pointer"
                                  >
                                    Thank Gift
                                  </button>
                                  <button
                                    onClick={() => handleRespondToComment(comment.id, 'spam')}
                                    className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-[9px] font-bold text-red-400 cursor-pointer"
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
                <div className="space-y-8 animate-fadeIn">
                  {/* Warning Notice Banner */}
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="text-[#D4AF37] shrink-0" size={18} />
                    <p className="text-xs text-[#D4AF37] font-semibold">
                      ⚠️ Note: Your examination scores will be officially recorded in your training history.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'foundations', title: 'Category A: Foundations Exam', desc: 'Focuses on Profile Optimization (Pillar 1), Live Quality (Pillar 2), and Consistency Models (Pillar 3).', icon: Trophy, color: 'text-amber-500' },
                      { id: 'growth', title: 'Category B: Growth Exam', desc: 'Focuses on Interactive Tools & Lucky Boxes (Pillar 4), Comment & Reaction Speeds (Pillar 5), and Fanbase Development (Pillar 6).', icon: Trophy, color: 'text-slate-400' },
                      { id: 'mastery', title: 'Category C: Mastery Exam', desc: 'Focuses on Retention & GC Calendars (Pillar 7), Monetization & Gratitude Loops (Pillar 8), and Intentional Goal Setting (Pillar 9).', icon: Award, color: 'text-yellow-400' }
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
                              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-all text-center cursor-pointer"
                            >
                              View Certificate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartQuiz(cert.id)}
                              className="btn-gold py-2 w-full text-center cursor-pointer"
                            >
                              Take Exam
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* History Transcripts Log Table */}
                  <div className="bg-[#0D0D14] border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <GraduationCap className="text-[#D4AF37]" size={18} />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Examination Scores History</h3>
                    </div>
                    {examScores.length === 0 ? (
                      <p className="text-xs text-[#A09E9A] italic py-4">No examination history found. Take your first quiz to record your score.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-white/10 text-[#5A5865] font-black uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-2">Category</th>
                              <th className="py-3 px-2">Score</th>
                              <th className="py-3 px-2">Percentage</th>
                              <th className="py-3 px-2">Date & Time</th>
                              <th className="py-3 px-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {examScores.map((score, index) => (
                              <tr key={index} className="text-[#A09E9A] hover:bg-white/03 transition-colors">
                                <td className="py-3 px-2 font-bold text-white">
                                  {score.category === 'foundations' ? 'Category A: Foundations Exam' :
                                   score.category === 'growth' ? 'Category B: Growth Exam' :
                                   score.category === 'mastery' ? 'Category C: Mastery Exam' : score.category}
                                </td>
                                <td className="py-3 px-2 font-mono">{score.score} / {score.total}</td>
                                <td className="py-3 px-2 font-mono">{Math.round((score.score / score.total) * 100)}%</td>
                                <td className="py-3 px-2 text-[11px]">{score.timestamp}</td>
                                <td className="py-3 px-2 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    score.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {score.passed ? 'PASSED' : 'RETRY REQUIRED'}
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
                    {viewingCertificate === 'foundations' ? 'Category A: Foundations Certificate' :
                     viewingCertificate === 'growth' ? 'Category B: Growth Certificate' :
                     viewingCertificate === 'mastery' ? 'Category C: Mastery Certificate' : 'Accredited Specialist'}
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
