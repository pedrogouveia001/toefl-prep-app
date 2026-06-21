// ==========================================================================
// CEREBRUM ENGLISH TUTOR - JAVASCRIPT STATE, SIMULADOS & ESTATÍSTICAS (V2)
// ==========================================================================

// Global States
let config = {
    apiKey: '',
    model: 'gemini-2.5-flash',
    voiceName: '',
    rate: 1.0,
    tutorPersona: 'friendly',
    silenceTimeout: 2500
};

let deck = [];
let speakingHistory = [];
let currentCardIndex = -1;
let recognition = null;
let isRecording = false;
let flashcardTimeoutId = null;

// YouTube Iframe Player API State
let toeflYTPlayer = null;
let toeflYTPlayerReady = false;
let toeflYTProgressInterval = null;

// Conversation System State
let conversationState = 'IDLE'; // IDLE | LISTENING | PROCESSING | AI_SPEAKING
let handsFreeMode = false;
let silenceTimer = null;
let interimTranscript = '';
let chatContents = []; // Gemini multi-turn contents: [{role, parts}]
let activeScenarioId = localStorage.getItem('cerebrum_active_scenario') || 'daily-life';
let sessionVocabulary = new Set();
let sessionFillerCount = 0;
let sessionTurnCount = 0;
let sessionStartTime = null;
const FILLER_WORDS = ['um', 'uh', 'uhm', 'er', 'ah', 'like', 'you know', 'basically', 'actually', 'literally', 'so yeah', 'i mean'];

// Conversation Scenarios (BeConfident-style)
const CONVERSATION_SCENARIOS = [
    {
        id: 'daily-life',
        name: 'Daily Life & Routines',
        emoji: '🏠',
        description: 'Chat about habits, hobbies, and weekend plans',
        starterMessage: "Hey there! I'd love to know more about you. What does a typical day look like for you? Do you have any morning routines that help you start the day right?",
        suggestedReplies: ['I usually wake up early and...', 'My mornings are pretty busy...', 'I\'m more of a night owl...'],
        systemPrompt: `You are a friendly English conversation partner having a casual chat about daily life and routines. 
Your goal is to help the user practice natural English conversation.
- Ask follow-up questions naturally based on what they say
- Introduce relevant vocabulary and idioms organically
- Keep your responses conversational (2-3 sentences max)
- If they make a grammar or vocabulary mistake, gently model the correct form in your response
- Show genuine interest in their answers`
    },
    {
        id: 'job-interview',
        name: 'Job Interview Practice',
        emoji: '🏢',
        description: 'Practice behavioral and technical interview questions',
        starterMessage: "Welcome! Let's practice for your job interview. I'll be the interviewer today. Let's start: Can you tell me about yourself and what motivated you to apply for this position?",
        suggestedReplies: ['I have a background in...', 'I\'m passionate about...', 'My experience includes...'],
        systemPrompt: `You are a professional HR interviewer conducting a job interview practice session.
- Ask common behavioral interview questions (STAR method)
- Give feedback on the structure and content of their answers
- Suggest more professional vocabulary and phrasing
- Progress from easy questions to harder ones (behavioral, situational, competency-based)
- Keep responses short (2-3 sentences) to maintain the interview pace
- After their answer, briefly note one strength and one area to improve before asking the next question`
    },
    {
        id: 'travel-airport',
        name: 'Travel & Airport',
        emoji: '✈️',
        description: 'Navigate airports, hotels, and travel situations',
        starterMessage: "Welcome to the airport check-in counter! I see you have a flight today. May I have your passport and booking confirmation, please? Where are you traveling to?",
        suggestedReplies: ['I\'m flying to London...', 'Here\'s my passport...', 'I need to check in two bags...'],
        systemPrompt: `You are playing various travel-related roles (airline agent, hotel receptionist, taxi driver, tour guide).
- Create realistic travel scenarios and role-plays
- Introduce travel-specific vocabulary naturally (boarding pass, layover, check-in, customs, etc.)
- Occasionally present small "problems" the user needs to solve in English (flight delay, lost luggage, wrong room)
- Keep your responses in-character and conversational (2-3 sentences)
- Cycle through different travel situations naturally as the conversation progresses`
    },
    {
        id: 'university',
        name: 'University Life',
        emoji: '🎓',
        description: 'Discuss courses, research, and academic topics',
        starterMessage: "Hi! I'm a fellow grad student. I heard you're working on some interesting research. What's your field of study, and what are you working on right now?",
        suggestedReplies: ['I\'m studying engineering...', 'My research focuses on...', 'I\'m in my final semester...'],
        systemPrompt: `You are a fellow university student or academic having a conversation about academic life.
- Discuss courses, professors, research topics, academic challenges
- Introduce academic vocabulary and collocations (conduct research, submit a thesis, peer review, etc.)
- Ask about their field and show genuine curiosity
- Help them practice explaining complex ideas in simple English
- Keep responses conversational and relatable (2-3 sentences)`
    },
    {
        id: 'business-meeting',
        name: 'Business Meeting',
        emoji: '💼',
        description: 'Present ideas, negotiate, and collaborate professionally',
        starterMessage: "Good morning, everyone. Thank you for joining this meeting. Before we go over the agenda, could you give us a quick update on your project's progress?",
        suggestedReplies: ['The project is on track...', 'We\'ve made good progress on...', 'There are a few challenges...'],
        systemPrompt: `You are a colleague in a professional business meeting.
- Simulate realistic meeting scenarios (status updates, brainstorming, decision-making, negotiations)
- Introduce business English vocabulary (stakeholder, deliverables, KPIs, action items, synergy, etc.)
- Practice professional phrases for agreeing, disagreeing, presenting ideas, and asking for clarification
- Keep the tone professional but warm (2-3 sentences)
- Occasionally create decision-making scenarios the user must navigate`
    },
    {
        id: 'doctor-appointment',
        name: 'Doctor\'s Appointment',
        emoji: '🏥',
        description: 'Describe symptoms and understand medical advice',
        starterMessage: "Good afternoon! I'm Dr. Smith. Please have a seat. What brings you in today? Can you describe what you've been experiencing?",
        suggestedReplies: ['I\'ve been having headaches...', 'I haven\'t been feeling well...', 'I have a pain in my...'],
        systemPrompt: `You are a friendly doctor conducting a medical consultation.
- Ask about symptoms, medical history, and lifestyle
- Introduce medical vocabulary in context (symptoms, diagnosis, prescription, side effects, etc.)
- Explain things clearly using both medical and everyday terms
- Practice the patient's ability to describe physical sensations and conditions in English
- Keep responses professional and empathetic (2-3 sentences)
- Give realistic (but general) medical advice and explanations`
    },
    {
        id: 'shopping-dining',
        name: 'Shopping & Restaurants',
        emoji: '🛒',
        description: 'Order food, compare products, and handle transactions',
        starterMessage: "Welcome to The Golden Plate! I'll be your server tonight. Here's the menu. Can I start you off with something to drink, or would you like to hear about our specials?",
        suggestedReplies: ['What do you recommend?', 'I\'d like to start with...', 'Do you have any vegetarian options?'],
        systemPrompt: `You are playing service industry roles (waiter, shop assistant, cashier, barista).
- Create realistic shopping and dining scenarios
- Introduce vocabulary for food, clothing, electronics, transactions (appetizer, entrée, fitting room, receipt, etc.)
- Practice polite requests, complaints, and negotiations
- Occasionally introduce small situations to solve (wrong order, defective product, price negotiation)
- Keep responses in-character and natural (2-3 sentences)
- Rotate between restaurants, clothing stores, electronics shops, and markets`
    },
    {
        id: 'current-events',
        name: 'News & Debate',
        emoji: '📰',
        description: 'Discuss current events and defend your opinions',
        starterMessage: "I read an interesting article today about how artificial intelligence is changing the way we work. Some people think AI will replace most jobs, while others see it as a tool that creates new opportunities. What's your take on this?",
        suggestedReplies: ['I think AI will...', 'In my opinion...', 'That\'s a complex issue because...'],
        systemPrompt: `You are an articulate debate partner who enjoys discussing current events and social issues.
- Bring up interesting, debatable topics (technology, environment, education, society, economy)
- Challenge the user's arguments respectfully with counter-points
- Introduce advanced vocabulary for expressing opinions and argumentation
- Practice phrases for agreeing, partially agreeing, and disagreeing politely
- Help them build structured arguments (claim, evidence, reasoning)
- Keep responses thought-provoking but concise (2-3 sentences)`
    },
    {
        id: 'entertainment',
        name: 'Entertainment & Culture',
        emoji: '🎬',
        description: 'Talk about movies, music, books, and shows',
        starterMessage: "So, have you watched anything good lately? I just finished an amazing series and I'm looking for recommendations. What kind of movies or shows are you into?",
        suggestedReplies: ['I recently watched...', 'I\'m a big fan of...', 'Have you seen...?'],
        systemPrompt: `You are a friend who loves discussing entertainment and pop culture.
- Chat about movies, TV shows, music, books, podcasts, and games
- Introduce entertainment vocabulary (plot twist, soundtrack, genre, binge-watch, cliffhanger, etc.)
- Practice describing stories, recommending things, and expressing preferences
- Share your own "opinions" and ask for theirs
- Keep the conversation fun, casual, and engaging (2-3 sentences)`
    },
    {
        id: 'sports-fitness',
        name: 'Sports & Fitness',
        emoji: '🏋️',
        description: 'Discuss training, competitions, teams, and health',
        starterMessage: "Hey! Are you into any sports? I've been trying to get more active lately and I'm curious about what you do to stay fit. Do you follow any sports teams?",
        suggestedReplies: ['I play soccer on weekends...', 'I\'ve been going to the gym...', 'I\'m a huge fan of...'],
        systemPrompt: `You are a sports enthusiast and fitness buddy.
- Discuss sports (football/soccer, basketball, tennis, F1, etc.), workout routines, health habits
- Introduce sports vocabulary (match, championship, league, reps, sets, warm-up, etc.)
- Talk about famous athletes, recent games, training tips
- Practice describing physical activities and athletic achievements
- Keep the conversation energetic and motivating (2-3 sentences)`
    },
    {
        id: 'technology-ai',
        name: 'Technology & AI',
        emoji: '🤖',
        description: 'Explore tech trends, gadgets, and artificial intelligence',
        starterMessage: "I've been reading a lot about generative AI lately — it's incredible how fast things are moving. Are you interested in technology? What tech topics fascinate you the most?",
        suggestedReplies: ['I\'m really interested in AI...', 'I work with technology...', 'I think the future of tech is...'],
        systemPrompt: `You are a tech-savvy conversationalist who loves discussing technology and innovation.
- Discuss AI, programming, gadgets, startups, social media, cybersecurity, and tech trends
- Introduce technical vocabulary in context (algorithm, machine learning, cloud computing, scalability, etc.)
- Make complex topics accessible and conversational
- Ask the user to explain tech concepts (great practice for technical English)
- Keep responses curious and engaging (2-3 sentences)`
    },
    {
        id: 'ielts-speaking',
        name: 'IELTS Speaking Mock',
        emoji: '📊',
        description: 'Full 3-part IELTS Speaking test simulation',
        starterMessage: "Good morning. My name is Sarah, and I'll be your examiner today for the IELTS Speaking test. This interview will be recorded. Let's begin with Part 1. Can you tell me your full name, please?",
        suggestedReplies: ['My name is...', 'You can call me...'],
        systemPrompt: `You are an official IELTS Speaking test examiner conducting a full 3-part test.
Tutor persona style: strict but fair.

PART 1 (Introduction, 4-5 minutes): Ask 3-4 simple questions about familiar topics (home, studies, work, hobbies).
PART 2 (Long Turn): After Part 1, give a cue card topic and say "You have 1 minute to prepare. Please speak for 1-2 minutes." Then ask 1-2 follow-up questions.
PART 3 (Discussion, 4-5 minutes): Ask deeper, abstract questions related to the Part 2 topic.

Track which part you are in and transition naturally.
Keep examiner responses very short (1-2 sentences) — the candidate should do most of the talking.

You MUST output JSON: {"response": "...", "grammar": "...", "collocations": "...", "pronunciation": "...", "fluencyNote": "...", "bandEstimate": "..."}`
    },
    {
        id: 'toefl-speaking',
        name: 'TOEFL Speaking Practice',
        emoji: '📝',
        description: 'Timed opinion responses and integrated tasks',
        starterMessage: "Welcome to TOEFL Speaking practice. We'll start with an Independent Speaking task. You'll have 15 seconds to prepare and 45 seconds to respond. Here's your prompt: 'Some people prefer to live in a big city, while others prefer a small town. Which do you prefer and why?'",
        suggestedReplies: ['I prefer living in a big city because...', 'I would choose a small town because...'],
        systemPrompt: `You are a TOEFL Speaking test simulator and tutor.
- Present Independent Speaking prompts (opinion-based) and Integrated Speaking tasks
- After the user responds, score their response on a scale of 0-4 using TOEFL criteria
- Provide specific feedback on: topic development, coherence, vocabulary range, and grammatical accuracy
- Suggest a model response they could have given
- Keep your feedback structured but concise

You MUST output JSON: {"response": "...", "grammar": "...", "collocations": "...", "pronunciation": "...", "fluencyNote": "...", "toeflScore": "..."}`
    },
    {
        id: 'toefl-tutor-coaching',
        name: 'Tutor Coaching & Check-in',
        emoji: '👨‍🏫',
        description: 'Review your study plan progress, check statistics, and get customized study advice.',
        starterMessage: "Hello Pedro! I'm your TOEFL study coach. I've reviewed your recent mock test logs and practice stats. Let's discuss how your prep is going. What section is challenging you the most right now, or would you like a quick diagnostic drill?",
        suggestedReplies: ['Can you review my recent scores?', 'Let\'s do a quick diagnostic drill!', 'I\'m having trouble with speaking pacing.'],
        systemPrompt: `You are Pedro's personalized academic TOEFL Tutor and Study Coach.
Your goal is to guide Pedro through his 3-month preparation cycle (90-120 mins/day, 4-day cycle: Reading, Listening, Speaking, Writing).
In this conversation scenario:
- Actively check Pedro's study metrics and mock history (which are dynamically provided in the chat context or described by Pedro)
- Recommend specific study techniques matching his strengths and weaknesses
- Focus on academic vocabulary from the Academic Word List (AWL) and multi-criteria decision collocations if relevant
- Suggest structured transitions (e.g., "Furthermore", "On the other hand", "Consequently") to help him score high
- Keep your answers encouraging, structured, and under 3-4 sentences.
- You MUST output JSON: {"response": "...", "grammar": "...", "collocations": "...", "pronunciation": "...", "fluencyNote": "..."}`
    }
];

// Statistics and Progress tracking database
let statsHistory = []; // Array of { date: "YYYY-MM-DD", speaking: float, writing: float, reading: float, listening: float }
let mockHistory = [];  // Array of { date: "YYYY-MM-DD", type: string, scoreRaw: int, scoreBand: float }
let writingHistory = []; // Array of { date: "YYYY-MM-DD", mode: string, task: string, prompt: string, band: string }
let writingCount = 0;

// Active Mock Test state
let mockTimerInterval = null;
let mockTimeRemaining = 1200; // 20 minutes in seconds
let activeMockType = 'ielts-reading';
let mockAudioPlaying = false;

// ==========================================================================
// DATA: EXPANDED FLASHCARDS DECK (> 60 CARDS)
// ==========================================================================
const EXPANDED_DECK_INITIAL = [
    // --- CATEGORY 1: OPERATIONS RESEARCH & MCDM COLLOCATIONS (1-30) ---
    { id: 1, category: 'MCDM Collocation', prompt: 'The analyst carried out a __________ analysis to test the stability of the final ranking.', answer: 'sensitivity', explanation: 'Sensitivity analysis determines how variations in criteria weights impact the final ordering of alternatives.', example: 'Sensitivity analysis is critical to show the decision-maker that the choice of weights is stable.', interval: 1, nextDue: Date.now() },
    { id: 2, category: 'MCDM Collocation', prompt: 'In ELECTRE and PROMETHEE, we establish an __________ relation to compare alternatives.', answer: 'outranking', explanation: 'An outranking relation represents the assertion that an alternative is at least as good as another.', example: 'Outranking methods allow for incomparability and veto effects.', interval: 1, nextDue: Date.now() },
    { id: 3, category: 'MCDM Collocation', prompt: 'Multi-attribute utility theory often relies on a simple __________ model.', answer: 'additive', explanation: 'An additive utility model aggregates criteria values by multiplying weights and summing them up.', example: 'The additive model assumes preferential independence between all criteria.', interval: 1, nextDue: Date.now() },
    { id: 4, category: 'MCDM Collocation', prompt: 'Before running the linear program, we need to elicit the __________ weights.', answer: 'criteria', explanation: 'Criteria weights represent the relative importance of each decision criteria or attribute.', example: 'We used Rank Order Centroid (ROC) weights to approximate the criteria importance.', interval: 1, nextDue: Date.now() },
    { id: 5, category: 'MCDM Collocation', prompt: 'The researcher designed a structured __________ to reduce the decision-maker\'s cognitive effort.', answer: 'protocol', explanation: 'A structured protocol guides the elicitation of preferences with clear step-by-step instructions.', example: 'We proposed a structured protocol for sensitivity analysis in the FITradeoff method.', interval: 1, nextDue: Date.now() },
    { id: 6, category: 'MCDM Collocation', prompt: 'Flexible __________ allows the decision-maker to declare preferences in a loose, comfortable order.', answer: 'elicitation', explanation: 'Elicitation is the process of extracting subjective judgments and values from a decision-maker.', example: 'Elicitation of preferences under partial information is the foundation of FITradeoff.', interval: 1, nextDue: Date.now() },
    { id: 7, category: 'MCDM Collocation', prompt: 'The system computed the __________ flow to establish the final complete ranking of B3 actions.', answer: 'net', explanation: 'In PROMETHEE II, the net flow represents the overall strength (leaving flow minus entering flow) of an alternative.', example: 'The stock with the highest net flow was recommended as the top investment alternative.', interval: 1, nextDue: Date.now() },
    { id: 8, category: 'MCDM Collocation', prompt: 'We make the __________ assumption that all criteria are mutually independent.', answer: 'simplifying', explanation: 'An assumption made to simplify mathematical formulations and ease cognitive elicitation.', example: 'Although criteria independence is a simplifying assumption, it works remarkably well in practice.', interval: 1, nextDue: Date.now() },
    { id: 9, category: 'OR Collocation', prompt: 'We developed a mathematical model to calculate the optimal __________ interval.', answer: 'calibration', explanation: 'Calibration intervals determine the time between metrological instrument checkups to maintain precision.', example: 'The CALIBRAINTER software determines the calibration interval dynamically using the A4 method.', interval: 1, nextDue: Date.now() },
    { id: 10, category: 'OR Collocation', prompt: 'To solve the aggregate planning problem, we designed an __________ algorithm.', answer: 'evolutionary', explanation: 'Evolutionary algorithms (like NSGA-II) simulate natural selection to solve complex multi-objective problems.', example: 'The dissertation proposed a multi-objective evolutionary algorithm for production scheduling.', interval: 1, nextDue: Date.now() },
    { id: 11, category: 'OR Collocation', prompt: 'A __________ support system (DSS) was programmed in Delphi and Python to run the model.', answer: 'decision', explanation: 'A decision support system (DSS) is a software package that helps managers analyze complex data and make choices.', example: 'He has over 4 years of experience building Decision Support Systems (SAD) for CDSID.', interval: 1, nextDue: Date.now() },
    { id: 12, category: 'OR Collocation', prompt: 'The researcher validated the solver using a __________ simulation model.', answer: 'discrete-event', explanation: 'Simulation models replicate the behavior of real-world processes under uncertainty.', example: 'A discrete-event simulation was run to validate the optimal calibration intervals.', interval: 1, nextDue: Date.now() },
    { id: 13, category: 'MCDM Collocation', prompt: 'In multicriteria problems, a choice that cannot be improved without worsening another criterion is __________.', answer: 'pareto-optimal', explanation: 'Pareto-optimal (or non-dominated) solutions represent the boundary of efficient choices in MCDM.', example: 'We generated a set of pareto-optimal portfolios for the investor.', interval: 1, nextDue: Date.now() },
    { id: 14, category: 'MCDM Collocation', prompt: 'A __________ value indicates the minimum level of performance required to avoid rejection.', answer: 'veto', explanation: 'A veto threshold in ELECTRE allows a single very bad criterion score to reject an alternative.', example: 'The veto threshold was set to prevent selecting projects with high environmental risk.', interval: 1, nextDue: Date.now() },
    { id: 15, category: 'MCDM Collocation', prompt: 'The decision-maker must make a __________ between cost and security.', answer: 'trade-off', explanation: 'A trade-off is a compromise between two conflicting objectives or criteria.', example: 'Planners faced a trade-off between ticket price and passenger comfort.', interval: 1, nextDue: Date.now() },
    { id: 16, category: 'MCDM Collocation', prompt: 'In outranking methods, we verify the __________ and veto thresholds.', answer: 'indifference', explanation: 'The indifference threshold defines the limit below which differences are considered negligible.', example: 'If the price difference is under $5, the user declares indifference.', interval: 1, nextDue: Date.now() },
    { id: 17, category: 'MCDM Collocation', prompt: 'The analyst constructed a __________ matrix showing alternatives in rows and criteria in columns.', answer: 'decision', explanation: 'A decision matrix is the core table containing performance scores of options across all criteria.', example: 'The first step of SMARTER is defining the decision matrix.', interval: 1, nextDue: Date.now() },
    { id: 18, category: 'MCDM Collocation', prompt: 'The additive model assumes criteria preference __________.', answer: 'independence', explanation: 'Preference independence means the trade-off between two criteria does not depend on other criteria.', example: 'Preference independence is a key requirement for using the additive utility model.', interval: 1, nextDue: Date.now() },
    { id: 19, category: 'OR Collocation', prompt: 'The program formulation contains a linear __________ function to be maximized.', answer: 'objective', explanation: 'The objective function defines the goal of the optimization model (e.g. max profit, min cost).', example: 'Our objective function represents the net flow of the stock portfolio.', interval: 1, nextDue: Date.now() },
    { id: 20, category: 'OR Collocation', prompt: 'The optimization algorithm uses a __________ approach to find a good solution quickly.', answer: 'heuristic', explanation: 'Heuristic algorithms find near-optimal solutions in a reasonable timeframe for hard problems.', example: 'We designed a genetic heuristic to solve the routing problem.', interval: 1, nextDue: Date.now() },
    { id: 21, category: 'OR Collocation', prompt: 'A model with no random variables is classified as a __________ model.', answer: 'deterministic', explanation: 'Deterministic models assume all parameters are known with absolute certainty.', example: 'Although market prices fluctuate, our base optimization model is deterministic.', interval: 1, nextDue: Date.now() },
    { id: 22, category: 'OR Collocation', prompt: 'To model supply chain delays, the researcher used a __________ programming approach.', answer: 'stochastic', explanation: 'Stochastic programming incorporates probability distributions to model uncertainty.', example: 'Stochastic optimization was applied to address supply chain disruptions.', interval: 1, nextDue: Date.now() },
    { id: 23, category: 'OR Collocation', prompt: 'The solver failed because one of the __________ was violated.', answer: 'constraints', explanation: 'Constraints represent restrictions or limits on the decision variables in an optimization model.', example: 'The budget constraint restricts the set of feasible investments.', interval: 1, nextDue: Date.now() },
    { id: 24, category: 'OR Collocation', prompt: 'We established the upper and lower __________ for the variables.', answer: 'bounds', explanation: 'Bounds define the range of acceptable values (minimum and maximum) for variables.', example: 'Criteria weights have a lower bound of zero and an upper bound of one.', interval: 1, nextDue: Date.now() },
    { id: 25, category: 'OR Collocation', prompt: 'Delphi is an object-oriented programming language based on Object __________.', answer: 'Pascal', explanation: 'Delphi is a software development environment using Object Pascal, used for rapid application building.', example: 'The legacy decision support system at CDSID was compiled in Delphi.', interval: 1, nextDue: Date.now() },
    { id: 26, category: 'MCDM Collocation', prompt: 'In FITradeoff, the elicitation process is based on __________ information.', answer: 'partial', explanation: 'Partial information means the decision-maker does not need to specify exact weights, only ranks or bounds.', example: 'FITradeoff uses linear programming to find the dominant alternative using partial information.', interval: 1, nextDue: Date.now() },
    { id: 27, category: 'OR Collocation', prompt: 'The research aims to __________ (otimizar) the warehouse layout.', answer: 'optimize', explanation: 'To make something as perfect, effective, or functional as possible.', example: 'The algorithm was designed to optimize the sequence of picking tasks.', interval: 1, nextDue: Date.now() },
    { id: 28, category: 'MCDM Collocation', prompt: 'The final results were stable, confirming the __________ of the solution.', answer: 'robustness', explanation: 'Robustness indicates the solution remains optimal or highly effective under parameter changes.', example: 'The robustness of the outranking relation was tested via sensitivity analysis.', interval: 1, nextDue: Date.now() },
    { id: 29, category: 'OR Collocation', prompt: 'We executed a __________ simulation to compare queue lengths.', answer: 'discrete-event', explanation: 'Discrete-event simulation models a system as a chronological sequence of distinct events.', example: 'The queue at the ticket office was analyzed using discrete-event simulation.', interval: 1, nextDue: Date.now() },
    { id: 30, category: 'OR Collocation', prompt: 'The master\'s student defended his __________ on transport optimization.', answer: 'dissertation', explanation: 'A long essay on a particular subject, especially one written for a university degree.', example: 'His dissertation proposed a hybrid MCDM approach for public transport lines.', interval: 1, nextDue: Date.now() },

    // --- CATEGORY 2: ACADEMIC WORD LIST (AWL) ESSENTIALS (31-90) ---
    { id: 31, category: 'AWL Verb', prompt: 'The team will __________ (analisar) the historical stock data to extract correlation values.', answer: 'analyze', explanation: 'To study or examine something in detail, in order to discover more about it.', example: 'We need to analyze the correlation between price variations and global values.', interval: 1, nextDue: Date.now() },
    { id: 32, category: 'AWL Verb', prompt: 'The software will __________ (derivar) criteria weights from the rank order provided.', answer: 'derive', explanation: 'To obtain, extract or deduce something from a specific source.', example: 'Weights are derived from the order of importance using the ROC formula.', interval: 1, nextDue: Date.now() },
    { id: 33, category: 'AWL Noun', prompt: 'We need a clear __________ (conceito) of outranking before comparing the assets.', answer: 'concept', explanation: 'An abstract idea, principle or general notion.', example: 'The concept of outranking is central to outranking methods.', interval: 1, nextDue: Date.now() },
    { id: 34, category: 'AWL Verb', prompt: 'The researcher wants to __________ (estabelecer) a new protocol for sensitivity analysis.', answer: 'establish', explanation: 'To set up, create or demonstrate something systematically.', example: 'They established a structured protocol for the FITradeoff method.', interval: 1, nextDue: Date.now() },
    { id: 35, category: 'AWL Noun', prompt: 'Our mathematical __________ (abordagem) avoids the need for exact weight inputs.', answer: 'approach', explanation: 'A way of dealing with or conceptualizing a situation or problem.', example: 'The FITradeoff approach requires only ordinal preferences.', interval: 1, nextDue: Date.now() },
    { id: 36, category: 'AWL Adjective', prompt: 'There was a __________ (significativa) correlation between the fundamentals and prices.', answer: 'significant', explanation: 'Large, important or statistically meaningful.', example: 'A significant positive correlation indicates that prices follow the global value.', interval: 1, nextDue: Date.now() },
    { id: 37, category: 'AWL Noun', prompt: 'The decision-maker provided a __________ (relevante) example of a veto condition.', answer: 'relevant', explanation: 'Closely connected or appropriate to the matter at hand.', example: 'The user must input relevant constraints to restrict the feasible space.', interval: 1, nextDue: Date.now() },
    { id: 38, category: 'AWL Verb', prompt: 'The algorithm will __________ (estimar) the upper and lower limits of the flows.', answer: 'estimate', explanation: 'To calculate or judge a value approximately.', example: 'We can estimate the band score of an essay using Gemini.', interval: 1, nextDue: Date.now() },
    { id: 39, category: 'AWL Noun', prompt: 'Our model is supported by an academic __________ (estrutura/framework) of utility theory.', answer: 'framework', explanation: 'A basic structure underlying a system, concept, or text.', example: 'This study fits into the framework of MCDM/A.', interval: 1, nextDue: Date.now() },
    { id: 40, category: 'AWL Noun', prompt: 'The thesis proposes a novel __________ (metodologia) for credit risk assessment.', answer: 'methodology', explanation: 'A system of methods, rules, and principles used in a particular area of study.', example: 'The methodology combines SMARTER with linear programming.', interval: 1, nextDue: Date.now() },
    { id: 41, category: 'AWL Verb', prompt: 'The solver will __________ (gerar) an optimal ranking based on the inputs.', answer: 'generate', explanation: 'To produce, create or bring into existence.', example: 'The tool will generate a full evaluation report.', interval: 1, nextDue: Date.now() },
    { id: 42, category: 'AWL Noun', prompt: 'The results are highly dependent on the __________ (contexto) of the decision.', answer: 'context', explanation: 'The circumstances that form the setting for an event, statement, or idea.', example: 'In the context of banking, liquidity is a crucial criterion.', interval: 1, nextDue: Date.now() },
    { id: 43, category: 'AWL Verb', prompt: 'We had to __________ (modificar) the algorithm to support portfolio selection.', answer: 'modify', explanation: 'To make partial changes to something, usually to improve it.', example: 'The code was modified to run a binary knapsack optimization.', interval: 1, nextDue: Date.now() },
    { id: 44, category: 'AWL Noun', prompt: 'The database contains a large __________ (volume) of financial indicator data.', answer: 'volume', explanation: 'A book forming part of a work, or the amount of space that a substance occupies.', example: 'The volume of stock quotes required database indexes.', interval: 1, nextDue: Date.now() },
    { id: 45, category: 'AWL Noun', prompt: 'The mathematical __________ (equação) calculates the centroids of the ranks.', answer: 'equation', explanation: 'A mathematical statement showing that two expressions are equal.', example: 'The ROC equation is easy to implement in Python.', interval: 1, nextDue: Date.now() },
    { id: 46, category: 'AWL Verb', prompt: 'It is difficult to __________ (identificar) the optimal weights manually.', answer: 'identify', explanation: 'To establish or indicate who or what something is.', example: 'He was able to identify the key bottlenecks.', interval: 1, nextDue: Date.now() },
    { id: 47, category: 'AWL Verb', prompt: 'The user must __________ (definir) the criteria ordering.', answer: 'define', explanation: 'To state or describe exactly the nature, scope, or meaning of.', example: 'You should define your criteria before comparing stocks.', interval: 1, nextDue: Date.now() },
    { id: 48, category: 'AWL Noun', prompt: 'Our __________ (hipótese) is that decision-makers are rational agents.', answer: 'hypothesis', explanation: 'A proposed explanation made on the basis of limited evidence as a starting point.', example: 'The null hypothesis states there is no correlation.', interval: 1, nextDue: Date.now() },
    { id: 49, category: 'AWL Noun', prompt: 'We need to check the __________ (consistência) of the pairwise comparisons.', answer: 'consistency', explanation: 'The quality of always behaving or performing in a similar way, or of being logical.', example: 'AHP uses a consistency index to evaluate comparisons.', interval: 1, nextDue: Date.now() },
    { id: 50, category: 'AWL Verb', prompt: 'The system can __________ (prever) the most attractive stock portfolio.', answer: 'predict', explanation: 'To say or estimate that a specified thing will happen in the future.', example: 'The model doesn\'t predict prices, but evaluates fundamentals.', interval: 1, nextDue: Date.now() },
    { id: 51, category: 'AWL Verb', prompt: 'We want to __________ (avaliar) the impact of parameter variations.', answer: 'assess', explanation: 'To evaluate or estimate the nature, ability, or quality of.', example: 'The reviewer wanted to assess our methodology.', interval: 1, nextDue: Date.now() },
    { id: 52, category: 'AWL Noun', prompt: 'The __________ (critério) for selection are cost and benefit.', answer: 'criteria', explanation: 'Plural of criterion; principles or standards by which something may be judged.', example: 'The criteria were selected based on the literature.', interval: 1, nextDue: Date.now() },
    { id: 53, category: 'AWL Noun', prompt: 'A __________ (modelo) of decision-making was developed for banking.', answer: 'model', explanation: 'A simplified representation of a system, process, or relationship.', example: 'The model uses FITradeoff to analyze investments.', interval: 1, nextDue: Date.now() },
    { id: 54, category: 'AWL Verb', prompt: 'The algorithm will __________ (formular) a set of linear constraints.', answer: 'formulate', explanation: 'To express a theory or plan systematically in words or formulas.', example: 'We had to formulate a new linear programming model.', interval: 1, nextDue: Date.now() },
    { id: 55, category: 'AWL Noun', prompt: 'The software provides a detailed __________ (análise) of the results.', answer: 'analysis', explanation: 'Detailed examination of the elements or structure of something.', example: 'The analysis shows that the option is robust.', interval: 1, nextDue: Date.now() },
    { id: 56, category: 'AWL Adjective', prompt: 'We noticed a __________ (constante) increase in stock values.', answer: 'constant', explanation: 'Occurring continuously over a period of time.', example: 'A constant stream of data is required for simulation.', interval: 1, nextDue: Date.now() },
    { id: 57, category: 'AWL Noun', prompt: 'Each __________ (setor) of the economy has different indicator ranges.', answer: 'sector', explanation: 'An area or portion that is distinct from others.', example: 'The banking sector was chosen for the TCC.', interval: 1, nextDue: Date.now() },
    { id: 58, category: 'AWL Noun', prompt: 'The solver provides a complete __________ (ordenação) of the stocks.', answer: 'ordering', explanation: 'The arrangement of items in a relation of sequence or hierarchy.', example: 'We generated a complete ordering of B3 stocks.', interval: 1, nextDue: Date.now() },
    { id: 59, category: 'AWL Verb', prompt: 'The solver can __________ (resolver) the optimization problem in seconds.', answer: 'solve', explanation: 'To find an answer to, explanation for, or means of effectively dealing with.', example: 'Python solvers can solve large linear programs instantly.', interval: 1, nextDue: Date.now() },
    { id: 60, category: 'AWL Adjective', prompt: 'The mathematical model is extremely __________ (preciso) and exact.', answer: 'precise', explanation: 'Marked by accuracy and detail.', example: 'A precise weight elicitation is not necessary in FITradeoff.', interval: 1, nextDue: Date.now() },
    { id: 61, category: 'AWL Verb', prompt: 'The data seem to __________ (indicar) a major market shift.', answer: 'indicate', explanation: 'To point out, show, or make something clear.', example: 'High outranking flows indicate preferred stocks.', interval: 1, nextDue: Date.now() },
    { id: 62, category: 'AWL Verb', prompt: 'We need to __________ (construir) a valid preference function.', answer: 'construct', explanation: 'To build or assemble physical or conceptual parts systematically.', example: 'Planners constructed a multi-attribute utility function.', interval: 1, nextDue: Date.now() },
    { id: 63, category: 'AWL Verb', prompt: 'The algorithm will __________ (distribuir) resources among sectors.', answer: 'distribute', explanation: 'To give shares of something or deal out among a group.', example: 'The knapsack solver will distribute the budget optimaly.', interval: 1, nextDue: Date.now() },
    { id: 64, category: 'AWL Verb', prompt: 'The decision-maker must __________ (interpretar) the sensitivity charts.', answer: 'interpret', explanation: 'To explain or understand the meaning of information, actions, or charts.', example: 'It is easy to interpret the charts in Cerebrum.', interval: 1, nextDue: Date.now() },
    { id: 65, category: 'AWL Verb', prompt: 'The analyst will __________ (buscar) advice from OR specialists.', answer: 'seek', explanation: 'To search for, ask for, or try to obtain.', example: 'The researchers sought a compromise solution for the subway line.', interval: 1, nextDue: Date.now() },
    { id: 66, category: 'AWL Verb', prompt: 'You should __________ (selecionar) a subset of key criteria.', answer: 'select', explanation: 'To choose from a number of alternatives.', example: 'The user will select between IELTS and TOEFL in the app.', interval: 1, nextDue: Date.now() },
    { id: 67, category: 'AWL Verb', prompt: 'The university wants to __________ (adquirir) new solver licenses.', answer: 'acquire', explanation: 'To buy or obtain for oneself.', example: 'We need to acquire historical B3 quotes.', interval: 1, nextDue: Date.now() },
    { id: 68, category: 'AWL Verb', prompt: 'The algorithm will __________ (ajustar) weights dynamically.', answer: 'adjust', explanation: 'To alter slightly to achieve accuracy or compatibility.', example: 'We can adjust the speech velocity in settings.', interval: 1, nextDue: Date.now() },
    { id: 69, category: 'AWL Adjective', prompt: 'A __________ (normal) distribution is assumed for the error margin.', answer: 'normal', explanation: 'Conforming to a standard, usual, or typical pattern.', example: 'The simulation assumes a normal distribution for queue arrivals.', interval: 1, nextDue: Date.now() },
    { id: 70, category: 'AWL Noun', prompt: 'Weights are divided by __________ (categoria) in AHP.', answer: 'category', explanation: 'A class or division of people or things regarded as having shared characteristics.', example: 'The flashcard category is shown on the front of the card.', interval: 1, nextDue: Date.now() },
    { id: 71, category: 'AWL Noun', prompt: 'The second __________ (fase) of the study involves coding the GUI.', answer: 'phase', explanation: 'A distinct period or stage in a series of events or a process.', example: 'The first phase of our English study plan focuses on vocabulary.', interval: 1, nextDue: Date.now() },
    { id: 72, category: 'AWL Verb', prompt: 'We must __________ (coordenar) our schedules to complete the paper.', answer: 'coordinate', explanation: 'To bring different elements or people into a harmonious or efficient relationship.', example: 'The MCDM organization coordinates public transit routes.', interval: 1, nextDue: Date.now() },
    { id: 73, category: 'AWL Noun', prompt: 'The chemical __________ (composto) was tested in the laboratory.', answer: 'compound', explanation: 'A substance formed from two or more elements chemically united.', example: 'TOEFL reading passages discuss compounds and ecosystems.', interval: 1, nextDue: Date.now() },
    { id: 74, category: 'AWL Noun', prompt: 'The construction __________ (local/site) was chosen based on MCDM.', answer: 'site', explanation: 'An area of ground on which a town, building, or monument is constructed.', example: 'We selected the optimal site for the new wind turbine.', interval: 1, nextDue: Date.now() },
    { id: 75, category: 'AWL Noun/Verb', prompt: 'There is an ongoing __________ (debate) about private funding in science.', answer: 'debate', explanation: 'A formal discussion on a particular topic in a public meeting or legislative assembly.', example: 'We discussed both sides of the funding debate in the essay.', interval: 1, nextDue: Date.now() },
    { id: 76, category: 'AWL Noun/Verb', prompt: 'You should __________ (documentar) all algorithmic assumptions.', answer: 'document', explanation: 'Record or detail in written, photographic, or other form.', example: 'I will document the new features in walkthrough.md.', interval: 1, nextDue: Date.now() },
    { id: 77, category: 'AWL Verb', prompt: 'We want to __________ (expandir) our research to global markets.', answer: 'expand', explanation: 'To become or make larger or more extensive.', example: 'This plan will expand the application to support 8 mock tests.', interval: 1, nextDue: Date.now() },
    { id: 78, category: 'AWL Adjective', prompt: 'Operations Research is a highly __________ (dinâmica) field.', answer: 'dynamic', explanation: 'Characterized by constant change, activity, or progress.', example: 'A dynamic interface makes the tutor application feel premium.', interval: 1, nextDue: Date.now() },
    { id: 79, category: 'AWL Verb', prompt: 'New patterns will __________ (emergir) from the dataset.', answer: 'emerge', explanation: 'To move out of or away from something and become visible; become apparent.', example: 'No clear winner emerged until we added the veto threshold.', interval: 1, nextDue: Date.now() },
    { id: 80, category: 'AWL Verb', prompt: 'The decision-maker did not __________ (alterar) his original preferences.', answer: 'alter', explanation: 'To change or cause to change in character or composition, typically in a small way.', example: 'Varying parameters did not alter the top alternative.', interval: 1, nextDue: Date.now() },
    { id: 81, category: 'AWL Noun', prompt: 'Buying stock B is a viable __________ (opção) for the investor.', answer: 'option', explanation: 'A thing that is or may be chosen.', example: 'The user has the option to simulate demo historical data.', interval: 1, nextDue: Date.now() },
    { id: 82, category: 'AWL Noun', prompt: 'The cards are presented in a random __________ (sequência).', answer: 'sequence', explanation: 'A particular order in which related events, movements, or things follow each other.', example: 'A chronological sequence of mock tests is kept in logs.', interval: 1, nextDue: Date.now() },
    { id: 83, category: 'AWL Verb', prompt: 'We resolved to __________ (resolver) the conflict via negotiation.', answer: 'resolve', explanation: 'To settle or find a solution to a problem, dispute, or contentious matter.', example: 'Sensitivity analysis helps resolve conflicts among criteria.', interval: 1, nextDue: Date.now() },
    { id: 84, category: 'AWL Noun', prompt: 'The indicator has a broad __________ (faixa) of possible values.', answer: 'range', explanation: 'The area of variation between upper and lower limits on a particular scale.', example: 'The speech velocity range goes from 0.6x to 1.5x.', interval: 1, nextDue: Date.now() },
    { id: 85, category: 'AWL Adjective', prompt: 'He gave a highly __________ (técnica) explanation of the solver.', answer: 'technical', explanation: 'Relating to a particular subject, art, or craft, or its practical skills.', example: 'Pedro writes technical scripts for Operations Research.', interval: 1, nextDue: Date.now() },
    { id: 86, category: 'AWL Adjective', prompt: 'The new algorithm is the __________ (principal) contribution of the thesis.', answer: 'prime', explanation: 'Of first importance; main or principal.', example: 'The prime objective is achieving IELTS Band 7.5.', interval: 1, nextDue: Date.now() },
    { id: 87, category: 'AWL Adjective', prompt: 'A __________ (robusto) model performs well even under heavy noise.', answer: 'robust', explanation: 'Strong and healthy; vigorous; (of a system or design) able to withstand adversity.', example: 'ELECTRE is known for providing robust outranking relations.', interval: 1, nextDue: Date.now() },
    { id: 88, category: 'AWL Noun', prompt: 'The __________ (núcleo) of the database is the flashcard deck.', answer: 'core', explanation: 'The central or most important part of something.', example: 'Core grammar rules must be mastered for a high writing band.', interval: 1, nextDue: Date.now() },
    { id: 89, category: 'AWL Noun', prompt: 'The researcher set a specific __________ (alvo/target) for accuracy.', answer: 'target', explanation: 'A person, object, or goal selected as the aim of an attack or effort.', example: 'Pedro\'s target score for the IELTS exam is 7.5.', interval: 1, nextDue: Date.now() },
    { id: 90, category: 'AWL Adjective', prompt: 'The exam score was declared __________ (válido) for two years.', answer: 'valid', explanation: 'Having a sound basis in logic or fact; reasonable or legally binding.', example: 'You must enter a valid Gemini API Key to run the conversation tutor.', interval: 1, nextDue: Date.now() },

    // --- CATEGORY 3: TOEFL & IELTS TRANSITION & ARGUMENTATION (91-125) ---
    { id: 91, category: 'Transition Word', prompt: 'The model is mathematically sound. __________, (além disso) it is computationally efficient.', answer: 'Furthermore', explanation: 'Used to introduce a fresh consideration or point in support of what has already been said.', example: 'Moreover, the user interface was designed to be intuitive.', interval: 1, nextDue: Date.now() },
    { id: 92, category: 'Transition Word', prompt: 'The indicator values decreased. __________, (consequentemente) the net flow fell.', answer: 'Consequently', explanation: 'As a result of something.', example: 'Consequently, the asset was ranked lower in the final list.', interval: 1, nextDue: Date.now() },
    { id: 93, category: 'Transition Word', prompt: 'We expected a failure. __________, (todavia) the model remained stable.', answer: 'Nevertheless', explanation: 'In spite of that; notwithstanding; all the same.', example: 'Nevertheless, we proceeded with the sensitivity analysis.', interval: 1, nextDue: Date.now() },
    { id: 94, category: 'Transition Word', prompt: 'AHP requires pairwise comparisons. __________, (em contraste) SMARTER uses simple ranks.', answer: 'Conversely', explanation: 'Used to compare two opposing things or ideas.', example: 'Conversely, outranking methods do not assume transitivity.', interval: 1, nextDue: Date.now() },
    { id: 95, category: 'Transition Word', prompt: 'The two stocks had scores of 0.8 and 0.5, __________ (respectivamente).', answer: 'respectively', explanation: 'Separately or individually and in the order already mentioned.', example: 'Company A and B were ranked first and second, respectively.', interval: 1, nextDue: Date.now() },
    { id: 96, category: 'Transition Word', prompt: '__________ (apesar de) the lack of complete information, a stable choice was made.', answer: 'Despite', explanation: 'Without being affected by; in spite of.', example: 'Despite the missing data, the outranking relation was established.', interval: 1, nextDue: Date.now() },
    { id: 97, category: 'Transition Word', prompt: 'We must consider the criteria weights; __________ (da mesma forma), we must evaluate the vetoes.', answer: 'likewise', explanation: 'In a like manner; similarly.', example: 'Likewise, we must verify the consistency of the judgments.', interval: 1, nextDue: Date.now() },
    { id: 98, category: 'Transition Word', prompt: 'Linear programming is fast. __________ (no entanto), integer programming can be slow.', answer: 'However', explanation: 'Introduces a statement that contrasts with or contradicts a previous one.', example: 'However, binary constraints require branch-and-bound algorithms.', interval: 1, nextDue: Date.now() },
    { id: 99, category: 'Transition Word', prompt: '__________ (primeiramente), we order the criteria. Secondly, we apply weights.', answer: 'Firstly', explanation: 'At the beginning; in the first place.', example: 'Firstly, we define the set of feasible alternatives.', interval: 1, nextDue: Date.now() },
    { id: 100, category: 'Transition Word', prompt: 'We analyzed all alternatives. __________ (em conclusão), the model is valid.', answer: 'In conclusion', explanation: 'Introduces a final summary or closing thought.', example: 'In conclusion, the decision support system works.', interval: 1, nextDue: Date.now() },
    { id: 101, category: 'Transition Word', prompt: 'The user made a mistake. __________ (em outras palavras), the weights were inconsistent.', answer: 'In other words', explanation: 'Expressing something in a different, usually simpler, way.', example: 'In other words, the pairwise matrix failed the AHP consistency test.', interval: 1, nextDue: Date.now() },
    { id: 102, category: 'Transition Word', prompt: 'We can use TOEFL __________ (ao invés de) IELTS if we prefer computer-based tests.', answer: 'instead of', explanation: 'As an alternative to.', example: 'Rather than using exact weights, we prefer the ROC approximation.', interval: 1, nextDue: Date.now() },
    { id: 103, category: 'Transition Word', prompt: 'The model has high precision, __________ (tornando) it suitable for industrial use.', answer: 'thereby', explanation: 'By that means; as a result of that.', example: 'We reduced the comparisons, thereby saving time.', interval: 1, nextDue: Date.now() },
    { id: 104, category: 'Transition Word', prompt: 'The ranking remains stable __________ (na medida em que) weights vary within the bounds.', answer: 'as long as', explanation: 'On the condition that.', example: 'Provided that the threshold is not exceeded, the ranking is stable.', interval: 1, nextDue: Date.now() },
    { id: 105, category: 'Transition Word', prompt: 'The asset is highly liquid; __________ (portanto), it is a safe investment.', answer: 'hence', explanation: 'As a consequence; for this reason.', example: 'The company is in debt; hence, it was excluded.', interval: 1, nextDue: Date.now() },
    { id: 106, category: 'Transition Word', prompt: 'The manager wanted to inspect the TCC, __________ (especificamente) the banking chapter.', answer: 'specifically', explanation: 'Clearly and explicitly.', example: 'The evaluation focused specifically on the sensitivity results.', interval: 1, nextDue: Date.now() },
    { id: 107, category: 'Transition Word', prompt: 'We used historical prices, __________ (enquanto que) other studies used simulations.', answer: 'whereas', explanation: 'In contrast or comparison with the fact that.', example: 'He programmed in Python, whereas the legacy system was in Delphi.', interval: 1, nextDue: Date.now() },
    { id: 108, category: 'Transition Word', prompt: 'We need to normalize the matrix __________ (a fim de) run the solver.', answer: 'in order to', explanation: 'With the purpose of doing something.', example: 'In order to compare different criteria, we must normalize their scales.', interval: 1, nextDue: Date.now() },
    { id: 109, category: 'Transition Word', prompt: 'The model is simple. __________ (mesmo assim), it handles complex scenarios.', answer: 'Even so', explanation: 'In spite of that; nevertheless.', example: 'The database is small. Even so, the queries are highly optimized.', interval: 1, nextDue: Date.now() },
    { id: 110, category: 'Transition Word', prompt: 'We need to evaluate the veto threshold, __________ (exemplo) the maximum difference.', answer: 'for instance', explanation: 'An instance or case illustrative of a general point.', example: 'For instance, we can set the veto threshold equal to 50.', interval: 1, nextDue: Date.now() },
    { id: 111, category: 'Transition Word', prompt: 'I do not agree with this formulation. __________, (pelo contrário) I believe it is flawed.', answer: 'On the contrary', explanation: 'Used to intensify a denial or contradict a statement.', example: 'It is not a failure; on the contrary, it is a major achievement.', interval: 1, nextDue: Date.now() },
    { id: 112, category: 'Transition Word', prompt: '__________ (à luz de) recent events, we adjusted our B3 investment strategy.', answer: 'In light of', explanation: 'Drawing attention to a fact that explains or affects a situation.', example: 'In light of inflation, defensive stocks are preferred.', interval: 1, nextDue: Date.now() },
    { id: 113, category: 'Transition Word', prompt: 'The model is not slow; __________ (de fato), it runs in milliseconds.', answer: 'as a matter of fact', explanation: 'In reality (used to introduce a point that contradicts or expands a previous statement).', example: 'As a matter of fact, Python libraries are highly optimized.', interval: 1, nextDue: Date.now() },
    { id: 114, category: 'Transition Word', prompt: 'We must avoid vetoes; __________ (isto quer dizer), the alternative must perform acceptably.', answer: 'that is to say', explanation: 'Used to introduce an explanation of what has just been said.', example: 'It was non-dominated, that is to say, pareto-optimal.', interval: 1, nextDue: Date.now() },
    { id: 115, category: 'Transition Word', prompt: '__________ (para dizer de outra forma), the algorithm runs out of memory.', answer: 'To put it another way', explanation: 'Expressing something in a different way for clarity.', example: 'To put it another way, the time complexity is exponential.', interval: 1, nextDue: Date.now() },
    { id: 116, category: 'Transition Word', prompt: '__________ (após) the calibration, the sensor reported accurate values.', answer: 'Subsequent to', explanation: 'After, following.', example: 'Subsequent to the initial review, we refactored the codebase.', interval: 1, nextDue: Date.now() },
    { id: 117, category: 'Transition Word', prompt: '__________ (antes) to the simulation run, the seed was initialized.', answer: 'Prior', explanation: 'Before, earlier in time.', example: 'Prior to our work, scheduling was done using Excel sheets.', interval: 1, nextDue: Date.now() },
    { id: 118, category: 'Transition Word', prompt: 'The two procedures run __________ (simultaneamente) to save processing time.', answer: 'concurrently', explanation: 'Happening or done at the same time.', example: 'Threads executed concurrently, improving the solver performance.', interval: 1, nextDue: Date.now() },
    { id: 119, category: 'Transition Word', prompt: 'The solver is running. __________ (enquanto isso), let\'s inspect the data.', answer: 'In the meantime', explanation: 'While something else is happening.', example: 'In the meantime, the dashboard displays a loading bar.', interval: 1, nextDue: Date.now() },
    { id: 120, category: 'Transition Word', prompt: 'The two methods are __________ (fundamentalmente) different.', answer: 'fundamentally', explanation: 'In central or primary respects.', example: 'AHP and outranking are fundamentally distinct approaches.', interval: 1, nextDue: Date.now() },
    { id: 121, category: 'Transition Word', prompt: '__________ (a este respeito), our study is similar to the literature.', answer: 'In this regard', explanation: 'Relating to the point just mentioned.', example: 'We used partial information; in this regard, we follow FITradeoff.', interval: 1, nextDue: Date.now() },
    { id: 122, category: 'Transition Word', prompt: 'We have no restrictions __________ (com respeito a) the number of criteria.', answer: 'with respect to', explanation: 'Concerning or in relation to.', example: 'With respect to cost, Option A is the best choice.', interval: 1, nextDue: Date.now() },
    { id: 123, category: 'Transition Word', prompt: '__________ (por comparação), outranking methods require fewer criteria weights.', answer: 'By comparison', explanation: 'When compared to something else.', example: 'By comparison, the new model is much simpler.', interval: 1, nextDue: Date.now() },
    { id: 124, category: 'Transition Word', prompt: 'All alternatives were evaluated, __________ (com a exceção de) the inactive ones.', answer: 'with the exception of', explanation: 'Excluding.', example: 'With the exception of B3 utilities, all sectors fell.', interval: 1, nextDue: Date.now() },
    { id: 125, category: 'Transition Word', prompt: 'The results are __________ (em linha com) our expectations.', answer: 'in line with', explanation: 'In agreement or conformity with.', example: 'This behavior is in line with standard utility theory.', interval: 1, nextDue: Date.now() },

    // --- CATEGORY 4: SPEAKING & WRITING IDIOMS / COLLOCATIONS (126-155) ---
    { id: 126, category: 'Academic Collocation', prompt: 'The research was conducted to __________ a critical gap in the existing literature.', answer: 'address', explanation: 'To direct attention, efforts, or resources towards solving a problem or filling a blank space in a body of research.', example: 'Before proposing the new MCDM model, we had to address a gap in the sensitivity analysis protocols.', interval: 1, nextDue: Date.now() },
    { id: 127, category: 'Academic Collocation', prompt: 'The new algorithm plays a __________ role in accelerating solver speed.', answer: 'pivotal', explanation: 'Crucial, essential, or of central importance.', example: 'MCDA methods play a pivotal role in selecting urban transit routes.', interval: 1, nextDue: Date.now() },
    { id: 128, category: 'Academic Collocation', prompt: 'After a lengthy discussion, the committee managed to __________ a consensus.', answer: 'reach', explanation: 'To arrive at an agreement, especially after effort or negotiation.', example: 'Decision-makers struggled to reach a consensus on criteria weights.', interval: 1, nextDue: Date.now() },
    { id: 129, category: 'Academic Collocation', prompt: 'We can __________ a parallel between AHP weights and SMARTER ranks.', answer: 'draw', explanation: 'To compare or point out similarities between two concepts or entities.', example: 'The author drew a parallel between optimization constraints and budget limits.', interval: 1, nextDue: Date.now() },
    { id: 130, category: 'Speaking Idiom', prompt: 'His detailed explanation painted a __________ picture of the factory operations.', answer: 'vivid', explanation: 'To describe something in a clear, detailed, and highly visual manner.', example: 'She painted a vivid picture of the challenges in developing countries.', interval: 1, nextDue: Date.now() },
    { id: 131, category: 'Speaking Idiom', prompt: 'The rise in local temperatures speaks __________ about the impact of climate change.', answer: 'volumes', explanation: 'To convey a great deal of information or meaning without using words.', example: 'The efficiency gains of the new transit line speak volumes.', interval: 1, nextDue: Date.now() },
    { id: 132, category: 'Speaking Idiom', prompt: 'The professor\'s lecture on neural networks gave us plenty of food for __________.', answer: 'thought', explanation: 'Something that warrants serious consideration or reflection.', example: 'The study on urban penalty was food for thought.', interval: 1, nextDue: Date.now() },
    { id: 133, category: 'Speaking Idiom', prompt: 'At the __________ of the day, we must choose one alternative.', answer: 'end', explanation: 'Ultimately; when everything is taken into consideration.', example: 'At the end of the day, mathematical consistency cannot replace human judgment.', interval: 1, nextDue: Date.now() },
    { id: 134, category: 'Speaking Idiom', prompt: 'Last but not __________, we must address the computational overhead.', answer: 'least', explanation: 'An introduction phrase indicating that the final point is as important as the previous ones.', example: 'Last but not least, we must thank the CDSID team for the support.', interval: 1, nextDue: Date.now() },
    { id: 135, category: 'Academic Collocation', prompt: 'We must __________ in mind that decision-makers are not always consistent.', answer: 'bear', explanation: 'To remember or take something into consideration.', example: 'Bear in mind that ordinal preferences reduce cognitive fatigue.', interval: 1, nextDue: Date.now() },
    { id: 136, category: 'Speaking Idiom', prompt: 'The researcher attempted to __________ a case for outranking methods.', answer: 'make', explanation: 'To present arguments or evidence supporting a specific conclusion.', example: 'The thesis makes a case for using PROMETHEE II in portfolio selection.', interval: 1, nextDue: Date.now() },
    { id: 137, category: 'Speaking Idiom', prompt: 'The audit brought to __________ several errors in the legacy code.', answer: 'light', explanation: 'To reveal or make information public.', example: 'The new test suite brought to light a division-by-zero bug.', interval: 1, nextDue: Date.now() },
    { id: 138, category: 'Speaking Idiom', prompt: 'The sensitivity charts throw __________ on the stability of the ranking.', answer: 'light', explanation: 'To clarify or provide explanations that make a topic easier to understand.', example: 'These simulations throw light on the asthenosphere dynamics.', interval: 1, nextDue: Date.now() },
    { id: 139, category: 'Academic Collocation', prompt: 'Technology has significantly raised the standard of __________ in cities.', answer: 'living', explanation: 'The level of wealth, comfort, and material goods available to a community.', example: 'Urbanization initially lowered the standard of living for factory workers.', interval: 1, nextDue: Date.now() },
    { id: 140, category: 'Academic Collocation', prompt: 'High inflation poses a __________ to economic growth.', answer: 'threat', explanation: 'To present a danger, risk, or challenge.', example: 'Pests pose a threat to agricultural productivity.', interval: 1, nextDue: Date.now() },
    { id: 141, category: 'Speaking Idiom', prompt: 'These discoveries paved the __________ for modern geology.', answer: 'way', explanation: 'To create circumstances that allow for future progress or development.', example: 'Wegener\'s work paved the way for plate tectonics.', interval: 1, nextDue: Date.now() },
    { id: 142, category: 'Speaking Idiom', prompt: 'We cannot take clean drinking water for __________.', answer: 'granted', explanation: 'To fail to appreciate something because it is always available or assumed.', example: 'He took for granted that the solver would always converge.', interval: 1, nextDue: Date.now() },
    { id: 143, category: 'Speaking Idiom', prompt: 'The eye-catching graph caught the examiner\'s __________.', answer: 'attention', explanation: 'To attract notice or interest.', example: 'The animated charts caught the user\'s attention.', interval: 1, nextDue: Date.now() },
    { id: 144, category: 'Academic Collocation', prompt: 'Planners require __________ evidence before changing bus routes.', answer: 'hard', explanation: 'Solid, undeniable facts or statistics (not just anecdotes).', example: 'We gathered hard evidence showing a reduction in traffic congestion.', interval: 1, nextDue: Date.now() },
    { id: 145, category: 'Academic Collocation', prompt: 'University courses should develop critical __________ skills.', answer: 'thinking', explanation: 'Objective analysis and evaluation of an issue in order to form a judgment.', example: 'Academic reading mocks test your critical thinking.', interval: 1, nextDue: Date.now() },
    { id: 146, category: 'Academic Collocation', prompt: 'Private funding of scientific research remains highly __________.', answer: 'controversial', explanation: 'Giving rise to public disagreement or heated debate.', example: 'Nuclear waste disposal sites are highly controversial.', interval: 1, nextDue: Date.now() },
    { id: 147, category: 'Speaking Idiom', prompt: 'The habit of manual scheduling is a __________ practice in the firm.', answer: 'deep-seated', explanation: 'Firmly established at a deep level (difficult to change).', example: 'The preference for Excel is a deep-seated habit in many departments.', interval: 1, nextDue: Date.now() },
    { id: 148, category: 'Speaking Idiom', prompt: 'The tutor advised me to keep in __________ with other researchers.', answer: 'touch', explanation: 'To maintain communication with someone.', example: 'We keep in touch with the CDSID organizers via GitHub.', interval: 1, nextDue: Date.now() },
    { id: 149, category: 'Academic Collocation', prompt: 'Delphi is a highly __________ environment for rapid development.', answer: 'recommended', explanation: 'Appealing, suggested, or praised as a good option.', example: 'Vite is highly recommended for building modern SPAs.', interval: 1, nextDue: Date.now() },
    { id: 150, category: 'Academic Collocation', prompt: 'The article is a __________ source of literature references.', answer: 'rich', explanation: 'Abundant or containing a large amount of valuable material.', example: 'The Lattes profile is a rich source of scientific project logs.', interval: 1, nextDue: Date.now() },
    { id: 151, category: 'Academic Collocation', prompt: 'Agriculture is the __________ source of income in the region.', answer: 'major', explanation: 'The primary, most important, or largest source.', example: 'Carbon emissions are a major source of global warming.', interval: 1, nextDue: Date.now() },
    { id: 152, category: 'Academic Collocation', prompt: 'The software supports a __________ range of voice configurations.', answer: 'wide', explanation: 'A large variety or extensive selection.', example: 'FITradeoff deals with a wide range of multicriteria applications.', interval: 1, nextDue: Date.now() },
    { id: 153, category: 'Academic Collocation', prompt: 'Symbiosis provides a __________ benefit to both organisms.', answer: 'mutual', explanation: 'Experienced or shared by each of two or more parties.', example: 'Our collaboration with the research team brought mutual benefits.', interval: 1, nextDue: Date.now() },
    { id: 154, category: 'Academic Collocation', prompt: 'The crisis required __________ action from the municipal government.', answer: 'immediate', explanation: 'Done at once; instant or urgent.', example: 'The high mortality rate called for immediate sanitary reforms.', interval: 1, nextDue: Date.now() },
    { id: 155, category: 'Academic Collocation', prompt: 'We expect a positive long-term __________ on student fluency.', answer: 'impact', explanation: 'A major, enduring effect or consequence on something.', example: 'The new study methodology had a long-term impact on his IELTS score.', interval: 1, nextDue: Date.now() }
];

// ==========================================================================
// DATA: MOCK TESTS (SIMULADOS) DATASETS
// ==========================================================================
const MOCK_TESTS = {
    'ielts-reading': {
        title: 'IELTS Reading Mock 1: The Evolution of Metrology',
        type: 'reading',
        passage: `
<p><strong>Paragraph A</strong><br>Metrology, the science of measurement, has always been an invisible anchor of human civilization. In ancient Mesopotamia and Egypt, standard units of length, such as the cubit, were established to facilitate monumental construction projects and govern agricultural trade. These early systems, though localized, were surprisingly rigid; the Egyptian royal cubit, made of black granite, was calibrated against a primary standard during each full moon. Failure to comply with this requirement was punishable by death, illustrating the critical importance of metrological consistency to early state structures.</p>

<p><strong>Paragraph B</strong><br>The industrial revolution of the 18th and 19th centuries exposed the limitations of fragmented measurement systems. As manufacturing moved from artisanal workshops to standardized assembly lines, the lack of interchangeable parts became a major economic bottleneck. A bolt made in Birmingham could rarely fit a nut turned in Manchester. This friction catalyzed the creation of the Metric System in revolutionary France, culminating in the 1875 Treaty of the Meter. By defining units of length (the meter) and mass (the kilogram) based on physical artifacts, the international community laid the foundation for modern global trade and scientific exchange.</p>

<p><strong>Paragraph C</strong><br>In the late 20th and early 21st centuries, metrologists undertook a profound shift: redefining measurement units based on fundamental physical constants rather than physical artifacts. The problem with physical prototypes, like the International Prototype Kilogram (IPK) stored in Paris, is their vulnerability. Over time, physical artifacts can gain or lose microscopic amounts of mass due to surface contamination or cleaning processes. By anchoring the kilogram to Planck's constant and the meter to the speed of light, modern science has established units that are immutable and accessible anywhere in the universe.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'According to Paragraph A, what was the penalty for failing to calibrate measurement standards in ancient Egypt?', options: ['A fine of grain', 'Imprisonment', 'Death', 'Exile'], correct: 'Death' },
            { id: 2, type: 'mc', text: 'Which event catalyzed the international standardization of the metric system?', options: ['The Mesopotamian wheat trade', 'The industrial revolution', 'The definition of Planck constant', 'Redefining the speed of light'], correct: 'The industrial revolution' },
            { id: 3, type: 'mc', text: 'What is the main problem of using physical artifacts (like the IPK) as measurement standards?', options: ['They are too heavy to transport', 'They are easily stolen', 'Their mass can change microscopically over time', 'They require expensive security'], correct: 'Their mass can change microscopically over time' },
            { id: 4, type: 'text', text: 'Fill in the blank (one word only): Ancient Egyptians calibrated the royal cubit made of black __________.', correct: 'granite' },
            { id: 5, type: 'text', text: 'Fill in the blank (one word only): The 1875 Treaty of the __________ laid the foundation for the Metric System.', correct: 'Meter' },
            { id: 6, type: 'mc', text: 'State if this statement is True, False or Not Given (T/F/NG): Mesopotamians used the royal cubit to build pyramids.', options: ['True', 'False', 'Not Given'], correct: 'Not Given' },
            { id: 7, type: 'mc', text: 'State if this statement is True, False or Not Given (T/F/NG): Redefining measurement based on physical constants makes them accessible globally.', options: ['True', 'False', 'Not Given'], correct: 'True' },
            { id: 8, type: 'mc', text: 'Which paragraph discusses the transition from localized systems to international treaties?', options: ['Paragraph A', 'Paragraph B', 'Paragraph C'], correct: 'Paragraph B' },
            { id: 9, type: 'text', text: 'Fill in the blank (one word only): Modern metrology anchors the kilogram to the __________ constant.', correct: 'Planck' },
            { id: 10, type: 'mc', text: 'What is the primary theme of Paragraph C?', options: ['Standardizing assembly lines', 'Redefining units based on physical constants', 'Punishing measurement fraud', 'The history of Egyptian cubit'], correct: 'Redefining units based on physical constants' }
        ]
    },
    'ielts-reading-agriculture': {
        title: 'IELTS Reading Mock 2: Artificial Intelligence in Precision Agriculture',
        type: 'reading',
        passage: `
<p><strong>Paragraph A</strong><br>Precision agriculture is currently undergoing a digital revolution powered by artificial intelligence. Traditionally, farming depended heavily on regional schedules and historical averages. Today, AI-powered systems process real-time telemetry from drones and soil sensors, allowing farmers to deliver localized water, pesticides, and nitrogen fertilizers. By avoiding blanket chemical applications, precision farming minimizes costs and environmental runoff.</p>

<p><strong>Paragraph B</strong><br>Deep learning models have proved incredibly useful in crop monitoring and disease detection. Convolutional Neural Networks (CNNs) trained on millions of botanical leaf images can identify early blight, rust, and pests with a level of precision that exceeds human experts. In vineyards and apple orchards, automated harvesting systems guided by computer vision can selectively pick ripe fruit without damaging the tree structure, resolving agricultural labor shortages.</p>

<p><strong>Paragraph C</strong><br>However, the barriers to adoption remain high for smallholder farmers, particularly in developing economies. The capital investment required for drone systems and smart machinery is substantial. Moreover, training local workforces to interpret statistical predictive models requires significant educational intervention. Addressing this gap requires public-private partnerships to subsidize technological acquisition and democratize access to cloud-based diagnostic applications.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'What is the primary advantage of real-time telemetry from soil sensors?', options: ['It predicts market prices', 'It allows localized chemical applications', 'It replaces human tractors', 'It increases rainfall levels'], correct: 'It allows localized chemical applications' },
            { id: 2, type: 'mc', text: 'Which AI model is primarily used for identifying crop diseases?', options: ['Recurrent Neural Networks', 'Linear Classifiers', 'Convolutional Neural Networks', 'Random Forests'], correct: 'Convolutional Neural Networks' },
            { id: 3, type: 'mc', text: 'According to Paragraph C, what is a major barrier to AI adoption in developing countries?', options: ['Lack of interest from local governments', 'The capital cost of technology and training', 'Vulnerability to software viruses', 'The lack of internet connectivity'], correct: 'The capital cost of technology and training' },
            { id: 4, type: 'text', text: 'Fill in the blank (one word only): Precision agriculture is guided by real-time telemetry from __________ and soil sensors.', correct: 'drones' },
            { id: 5, type: 'text', text: 'Fill in the blank (one word only): Computer vision systems selectively pick fruit without causing damage to the __________ structure.', correct: 'tree' },
            { id: 6, type: 'mc', text: 'State if this is True, False or Not Given (T/F/NG): Most vineyards in Europe have already automated their harvesting systems.', options: ['True', 'False', 'Not Given'], correct: 'Not Given' },
            { id: 7, type: 'mc', text: 'State if this is True, False or Not Given (T/F/NG): Blanket applications of chemicals are more environmentally friendly than precision methods.', options: ['True', 'False', 'Not Given'], correct: 'False' },
            { id: 8, type: 'mc', text: 'Which paragraph discusses agricultural labor shortages?', options: ['Paragraph A', 'Paragraph B', 'Paragraph C'], correct: 'Paragraph B' },
            { id: 9, type: 'text', text: 'Fill in the blank (one word only): To help smallholder farmers, public-private partnerships should __________ technological acquisition.', correct: 'subsidize' },
            { id: 10, type: 'mc', text: 'What is the main message of Paragraph C?', options: ['Technological details of CNN models', 'Water conservation in vineyards', 'The financial and educational challenges of implementing agricultural AI', 'The history of traditional crop schedules'], correct: 'The financial and educational challenges of implementing agricultural AI' }
        ]
    },
    'ielts-reading-or': {
        title: 'IELTS Reading Mock 3: Operations Research in Public Transport',
        type: 'reading',
        passage: `
<p><strong>Paragraph A</strong><br>Operations Research (OR) emerged as a formal discipline during World War II, but its application to urban planning has shaped the efficiency of modern cities. In public transportation systems, scheduling vehicles and crews represents a classical combinatorial optimization problem. Transit agencies must balance two conflicting objectives: maximizing customer service frequency and minimizing operational expenditures. Historically, planners solved these problems using manual trial-and-error, but the scale of modern cities has rendered computational algorithms indispensable.</p>

<p><strong>Paragraph B</strong><br>Multi-criteria decision analysis (MCDA) plays a key role in route selection and resource allocation. When extending a subway or bus rapid transit line, planners cannot rely solely on passenger volume. They must evaluate socio-economic impacts, environmental disruption, construction feasibility, and political consensus. By utilizing methods like the additive utility model or outranking relations, decision-makers can systematically weigh criteria to choose a route that provides a compromise solution among competing stakeholders.</p>

<p><strong>Paragraph C</strong><br>The integration of discrete-event simulation allows planners to stress-test transport systems under extreme conditions. A simulation replicates passenger flow, ticketing queues, and vehicle delays in a digital sandbox. This helps identify bottlenecks in hub design before concrete is poured. Although mathematical models are simplifying abstractions of reality, their predictive value has saved municipal taxpayers billions of dollars in infrastructure costs.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'What was the origin of Operations Research as a formal discipline?', options: ['The industrial revolution', 'World War II', 'Mesopotamian trade routes', 'The Treaty of the Meter'], correct: 'World War II' },
            { id: 2, type: 'mc', text: 'What are the two conflicting objectives transit agencies must balance?', options: ['Speed of light and Planck\'s constant', 'Customer service frequency and operational expenditures', 'Subway routes and bus routes', 'Manual design and computational speed'], correct: 'Customer service frequency and operational expenditures' },
            { id: 3, type: 'mc', text: 'Why is passenger volume insufficient for bus line route planning?', options: ['Passenger volume is too hard to calculate', 'Other criteria like socio-economic impact and environment must be evaluated', 'Subway lines do not require passengers', 'Veto thresholds are always zero'], correct: 'Other criteria like socio-economic impact and environment must be evaluated' },
            { id: 4, type: 'text', text: 'Fill in the blank (one word only): Operations Research scheduling represents a classical combinatorial __________ problem.', correct: 'optimization' },
            { id: 5, type: 'text', text: 'Fill in the blank (one word only): Discrete-event simulation allows transport systems to be stress-tested in a digital __________ before construction.', correct: 'sandbox' },
            { id: 6, type: 'mc', text: 'State if this is True, False or Not Given (T/F/NG): The AHP method is the only MCDA method used in transport planning.', options: ['True', 'False', 'Not Given'], correct: 'Not Given' },
            { id: 7, type: 'mc', text: 'State if this is True, False or Not Given (T/F/NG): Mathematical models provide a perfect, 100% accurate representation of reality.', options: ['True', 'False', 'Not Given'], correct: 'False' },
            { id: 8, type: 'mc', text: 'Which paragraph discusses routes selection and outranking relations?', options: ['Paragraph A', 'Paragraph B', 'Paragraph C'], correct: 'Paragraph B' },
            { id: 9, type: 'text', text: 'Fill in the blank (one word only): The route selection process seeks to find a __________ solution among stakeholders.', correct: 'compromise' },
            { id: 10, type: 'mc', text: 'What is the primary focus of Paragraph C?', options: ['The history of public transit', 'The benefits of discrete-event simulation in hub design', 'The difference between outranking and additive utility', 'Eliciting criteria weights from taxpayers'], correct: 'The benefits of discrete-event simulation in hub design' }
        ]
    },
    'ielts-listening': {
        title: 'IELTS Listening Mock 1: Campus Accommodation Interview',
        type: 'listening',
        audioText: `
        Hello, and welcome to the Campus Housing Office. I am the accommodation officer.
        Today, I am interviewing a new graduate student, Pedro, who is applying for university housing.
        Let's begin the registration.
        First, Pedro's contact number is 81 99994 7874.
        He is studying a Master's degree in Production Engineering at the University of Pernambuco.
        He prefers a quiet study environment because he conducts intensive research on decision support systems and mathematical modeling.
        For his room, he prefers a single room with a large desk to fit his laptop and research papers.
        His preferred budget is under 400 dollars per month.
        He wants to move in on the fifth of September, before the semester starts.
        He also requested a room close to the computer science department because he takes additional courses in programming.
        This completes our housing registration details. Thank you.
        `,
        passage: `
<p><strong>🔊 IELTS Listening Simulation</strong><br>Click the play button below to listen to the recording. Fill out the accommodation form on the right based on the details heard. You can listen to the audio only once.</p>
        `,
        questions: [
            { id: 1, type: 'text', text: 'Student\'s First Name:', correct: 'Pedro' },
            { id: 2, type: 'text', text: 'Major Course of Study:', correct: 'Production Engineering' },
            { id: 3, type: 'text', text: 'Contact Number (e.g., 81 99994 7874):', correct: '81 99994 7874' },
            { id: 4, type: 'text', text: 'Preferred Room Type (e.g. double, single):', correct: 'single' },
            { id: 5, type: 'text', text: 'Maximum Monthly Budget (in dollars):', correct: '400' },
            { id: 6, type: 'text', text: 'Expected Move-in Date (Day and Month, e.g. 5 September):', correct: '5 September' },
            { id: 7, type: 'text', text: 'Preferred Department Proximity (e.g. computer science, chemistry):', correct: 'computer science' },
            { id: 8, type: 'mc', text: 'Pedro is a...', options: ['Undergraduate Student', 'Graduate Student', 'Post-doctoral Researcher'], correct: 'Graduate Student' },
            { id: 9, type: 'mc', text: 'Pedro requires a room with a large desk primarily for his...', options: ['Laptop and research papers', 'Gaming console', 'Mechanical books'], correct: 'Laptop and research papers' },
            { id: 10, type: 'mc', text: 'Pedro wants to move in...', options: ['After the semester starts', 'Before the semester starts', 'In October'], correct: 'Before the semester starts' }
        ]
    },
    'ielts-listening-library': {
        title: 'IELTS Listening Mock 2: University Library Registration',
        type: 'listening',
        audioText: `
        Welcome to the Main Library. Let's register you for your library membership.
        My name is Sarah, and I will be helping you today.
        First, let's record your student ID number, which is 2026-9871.
        Your first name is Elena, spelled E-L-E-N-A, and your last name is Smith.
        You are enrolled in the Master's program in Data Analytics at the Department of Science.
        You prefer a quiet study space, and the postgraduate study room is located on the third floor.
        Your academic email address is elena.smith@university.edu.
        The borrowing limit for graduate students is 25 items at one time.
        The standard loan period for textbooks is 4 weeks, but this can be renewed online.
        The library is open from 8:00 AM until 10:00 PM on weekdays.
        Finally, you must pay a refundable deposit of 30 dollars for the postgraduate access card.
        This completes your registration. Thank you.
        `,
        passage: `
<p><strong>🔊 IELTS Listening Simulation</strong><br>Click the play button below to listen to the library registration details. Complete the registration form on the right based on the details heard.</p>
        `,
        questions: [
            { id: 1, type: 'text', text: 'Student ID Number (e.g. 2026-9871):', correct: '2026-9871' },
            { id: 2, type: 'text', text: 'Student\'s First Name:', correct: 'Elena' },
            { id: 3, type: 'text', text: 'Student\'s Major Course:', correct: 'Data Analytics' },
            { id: 4, type: 'text', text: 'Postgraduate Room Location (e.g. second, third):', correct: 'third' },
            { id: 5, type: 'text', text: 'Academic Email (e.g. elena.smith@university.edu):', correct: 'elena.smith@university.edu' },
            { id: 6, type: 'text', text: 'Borrowing Item Limit:', correct: '25' },
            { id: 7, type: 'text', text: 'Loan Period in Weeks:', correct: '4' },
            { id: 8, type: 'mc', text: 'The library closing time on weekdays is:', options: ['8:00 PM', '10:00 PM', 'Midnight', '9:00 PM'], correct: '10:00 PM' },
            { id: 9, type: 'text', text: 'Postgraduate Card Deposit (in dollars):', correct: '30' },
            { id: 10, type: 'mc', text: 'What is Elena\'s department?', options: ['Department of Arts', 'Department of Science', 'Department of Business'], correct: 'Department of Science' }
        ]
    },
    'toefl-reading': {
        title: 'TOEFL Reading Mock 1: Coral Reef Symbiosis',
        type: 'reading',
        passage: `
<p><strong>Section 1: The Reef Ecosystem</strong><br>Coral reefs, often termed the "rainforests of the sea," thrive in nutrient-poor tropical waters. Their abundance in areas devoid of substantial planktonic nutrients is an ecological paradox made possible by a delicate symbiotic relationship. This mutualistic association occurs between reef-building scleractinian corals and microscopic, single-celled algae known as zooxanthellae. The algae reside within the gastrodermal tissues of the coral polyps, protected from predators and supplied with waste compounds from the host's metabolism, such as carbon dioxide, ammonium, and phosphate.</p>

<p><strong>Section 2: Photosynthetic Exchange</strong><br>In return for shelter and nutrients, the zooxanthellae perform photosynthesis, converting solar energy into organic products. These products, which include glucose, glycerol, and amino acids, are translocated to the coral host, providing up to 90% of the animal's energy requirements. This cellular energy fuels the coral's active calcification process, enabling it to deposit calcium carbonate skeleton at rates far exceeding those of corals lacking zooxanthellae. Thus, this exchange is not merely nutritional, but the driving force behind the physical construction of the entire reef framework.</p>

<p><strong>Section 3: Bleaching Threats</strong><br>This relationship is highly sensitive to thermal variations. An increase in sea surface temperature of just one degree Celsius above the summer average can trigger coral bleaching. Under thermal stress, the photosynthetic apparatus of the zooxanthellae becomes damaged, producing toxic reactive oxygen species. To protect itself, the coral host expels the algae, losing its pigment and exposing its white calcium carbonate skeleton. If temperature levels return to normal, the corals can reacquire zooxanthellae and recover; however, prolonged thermal stress leads to host starvation, skeletal degeneration, and eventual mortality.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'The word "devoid" in Section 1 is closest in meaning to:', options: ['Lacking', 'Filled', 'Saturated', 'Supported'], correct: 'Lacking' },
            { id: 2, type: 'mc', text: 'According to Section 1, which of the following is a waste product supplied by corals to zooxanthellae?', options: ['Glucose', 'Oxygen', 'Carbon Dioxide', 'Calcium Carbonate'], correct: 'Carbon Dioxide' },
            { id: 3, type: 'mc', text: 'Why is the abundance of coral reefs in nutrient-poor waters described as a "paradox"?', options: ['Because reefs produce more nutrients than they consume', 'Because abundant life is found where few external nutrients exist', 'Because zooxanthellae are toxic to other marine life', 'Because scleractinian corals do not deposit calcium'], correct: 'Because abundant life is found where few external nutrients exist' },
            { id: 4, type: 'mc', text: 'According to Section 2, the energy provided by zooxanthellae is primarily used by corals to:', options: ['Fight off bacterial infections', 'Deposit calcium carbonate skeleton', 'Attract larval prey', 'Migrate to deeper waters'], correct: 'Deposit calcium carbonate skeleton' },
            { id: 5, type: 'mc', text: 'What is the role of solar energy in the symbiotic relationship?', options: ['It breaks down calcium carbonate', 'It triggers coral bleaching', 'It drives photosynthesis in the algae', 'It warms the gastrodermal tissues'], correct: 'It drives photosynthesis in the algae' },
            { id: 6, type: 'mc', text: 'The word "translocated" in Section 2 is closest in meaning to:', options: ['Destroyed', 'Transferred', 'Stored', 'Inhibited'], correct: 'Transferred' },
            { id: 7, type: 'mc', text: 'According to Section 3, thermal stress causes zooxanthellae to:', options: ['Multiply rapidly inside the tissue', 'Release toxic reactive oxygen species', 'Consume the host polyps', 'Shed their pigments'], correct: 'Release toxic reactive oxygen species' },
            { id: 8, type: 'mc', text: 'Coral bleaching is defined as:', options: ['The deposition of excessive calcium carbonate', 'The expulsion of zooxanthellae due to stress', 'The invasion of competitive macroalgae', 'The chemical dissolution of the reef by acid'], correct: 'The expulsion of zooxanthellae due to stress' },
            { id: 9, type: 'mc', text: 'Which of the following can be inferred from Section 3 about bleached corals?', options: ['They cannot survive if sea temperatures return to normal', 'They are permanently unable to reacquire algae', 'They are in danger of starvation if bleaching is prolonged', 'They grow faster without the algae'], correct: 'They are in danger of starvation if bleaching is prolonged' },
            { id: 10, type: 'mc', text: 'What is the main topic of Section 3?', options: ['The benefits of calcification', 'The metabolic wastes of polyps', 'The impact of temperature changes on the symbiosis', 'The classification of scleractinian corals'], correct: 'The impact of temperature changes on the symbiosis' }
        ]
    },
    'toefl-reading-urbanization': {
        title: 'TOEFL Reading Mock 2: 19th Century Urbanization and Industrialization',
        type: 'reading',
        passage: `
<p><strong>Section 1: The Steam Engine and Factory Concentration</strong><br>The shift from water power to steam power during the 19th century decoupled industrial production from rural river valleys. Steam engines allowed factories to locate in urban centers, close to transport hubs and large pools of labor. This concentration created a self-reinforcing loop: factories attracted workers, workers expanded the domestic market, and the dense population justified further infrastructure investments, such as rail terminals and gas street lighting.</p>

<p><strong>Section 2: Social Transformations and Public Health</strong><br>This rapid population influx overwhelmed municipal services. Cities grew without planning, leading to overcrowding and poorly ventilated housing tenements. Devoid of adequate sanitation, sewage systems, or clean drinking water, urban centers became breeding grounds for infectious diseases like cholera and tuberculosis. The high mortality rates in urban areas created an "urban penalty," where life expectancy was significantly lower than in rural areas, sparking the sanitarians' reform movement.</p>

<p><strong>Section 3: Technological Solutions and Policy Shift</strong><br>By the late 19th century, civil engineering and government policy intervened. Cities began constructing massive underground sewer systems and importing clean water from distant reservoirs. Furthermore, the development of public transit, including horse-drawn omnibuses and electric streetcars, allowed workers to live further from factory districts. This spatial segregation of residential and industrial zones marked the beginning of modern urban planning.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'The word "decoupled" in Section 1 is closest in meaning to:', options: ['Disconnected', 'Amplified', 'Accelerated', 'Integrated'], correct: 'Disconnected' },
            { id: 2, type: 'mc', text: 'According to Section 1, how did steam power affect factory locations?', options: ['It forced them near rural river valleys', 'It allowed them to locate in urban centers', 'It made them independent of transportation hubs', 'It reduced their dependency on manual labor'], correct: 'It allowed them to locate in urban centers' },
            { id: 3, type: 'mc', text: 'Which of the following is NOT mentioned in Section 1 as an urban infrastructure benefit?', options: ['Rail terminals', 'Gas street lighting', 'Telephone networks', 'Factory concentration'], correct: 'Telephone networks' },
            { id: 4, type: 'mc', text: 'The word "influx" in Section 2 is closest in meaning to:', options: ['Decline', 'Arrival', 'Distribution', 'Adaptation'], correct: 'Arrival' },
            { id: 5, type: 'mc', text: 'According to Section 2, what was the primary cause of the "urban penalty"?', options: ['Lack of employment opportunities', 'Lack of sanitation and spread of disease', 'The high cost of steam coal', 'The lack of public transit'], correct: 'Lack of sanitation and spread of disease' },
            { id: 6, type: 'mc', text: 'Based on Section 2, what can be inferred about life expectancy in the 19th century?', options: ['Rural areas had higher life expectancy than industrial cities', 'Sanitarians were unable to improve life expectancy', 'Tenement housing was healthier than rural cottages', 'Tuberculosis did not affect rural populations'], correct: 'Rural areas had higher life expectancy than industrial cities' },
            { id: 7, type: 'mc', text: 'According to Section 3, civil engineers addressed public health issues by:', options: ['Banning steam engines from cities', 'Building underground sewer systems', 'Demolishing all factory districts', 'Closing city gates to immigrants'], correct: 'Building underground sewer systems' },
            { id: 8, type: 'mc', text: 'What was the consequence of developing public transit systems?', options: ['It concentrated more workers inside factories', 'It allowed workers to live further away from their workplaces', 'It caused passenger queues at rail terminals', 'It eliminated the need for sewers'], correct: 'It allowed workers to live further away from their workplaces' },
            { id: 9, type: 'mc', text: 'The word "segregation" in Section 3 is closest in meaning to:', options: ['Separation', 'Cooperation', 'Improvement', 'Construction'], correct: 'Separation' },
            { id: 10, type: 'mc', text: 'What is the main theme of Section 3?', options: ['The history of horse-drawn omnibuses', 'Municipal planning and technological solutions to urban problems', 'The decline of rural industries', 'Veto thresholds in urban investments'], correct: 'Municipal planning and technological solutions to urban problems' }
        ]
    },
    'toefl-listening-tectonics': {
        title: 'TOEFL Listening Mock 1: Plate Tectonics and Continental Drift',
        type: 'listening',
        audioText: `
        Welcome back to the Geology lecture.
        Today, we are discussing the dynamic nature of Earth's lithosphere, specifically the theory of plate tectonics.
        For centuries, observers noticed that the coastlines of South America and Africa fit together like pieces of a puzzle.
        In 1912, Alfred Wegener proposed the theory of continental drift. He hypothesized that all continents were once part of a supercontinent called Pangaea.
        Wegener pointed to fossil evidence, such as matching plant and reptile fossils found on widely separated landmasses.
        However, the geological community rejected Wegener's theory because he could not identify the mechanism that drove the movement of continents. He suggested they plowed through the ocean floor, which geologists knew was physically impossible.
        It wasn't until the 1960s, with the discovery of sea-floor spreading at mid-ocean ridges, that the mechanism was found.
        Magma rises from the mantle, cools, and forms new oceanic crust, pushing the plates apart.
        This led to the modern theory of plate tectonics, where tectonic plates slide on the semi-fluid asthenosphere below.
        This process explains earthquakes, volcanic activity, and the formation of massive mountain ranges.
        That's all for today. Read chapter 5 before our lab tomorrow.
        `,
        passage: `
<p><strong>🔊 TOEFL Listening Simulation</strong><br>Click the play button below to listen to the geology lecture. Answer the multiple-choice questions on the right based on the lecture contents.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'What is the main topic of the lecture?', options: ['The formation of the oceans', 'The history and mechanism of plate tectonics', 'The discovery of reptile fossils', 'Volcanic eruptions in South America'], correct: 'The history and mechanism of plate tectonics' },
            { id: 2, type: 'mc', text: 'Who proposed the theory of continental drift in 1912?', options: ['Alfred Wegener', 'Sarah Smith', 'Albert Einstein', 'Planck Kilogram'], correct: 'Alfred Wegener' },
            { id: 3, type: 'mc', text: 'What is the name of the ancient supercontinent mentioned in the lecture?', options: ['Pangaea', 'Mesopotamia', 'Asthenosphere', 'Pernambuco'], correct: 'Pangaea' },
            { id: 4, type: 'mc', text: 'What fossil evidence did Wegener use to support his theory?', options: ['Matching plants and reptile fossils on separated landmasses', 'Mammoth skeletal remains', 'Granite artifacts', 'Ancient human footprints'], correct: 'Matching plants and reptile fossils on separated landmasses' },
            { id: 5, type: 'mc', text: 'Why did the scientific community reject Wegener\'s proposal?', options: ['He lacked matching coastlines data', 'He did not have a logical physical mechanism to explain continental drift', 'He calculated everything using ancient Egyptian cubits', 'He had no fossil samples'], correct: 'He did not have a logical physical mechanism to explain continental drift' },
            { id: 6, type: 'mc', text: 'Which discovery in the 1960s resolved the mechanism controversy?', options: ['Deep ocean subduction maps', 'Sea-floor spreading at mid-ocean ridges', 'Tornado and wind patterns', 'Active volcanic eruptions in Africa'], correct: 'Sea-floor spreading at mid-ocean ridges' },
            { id: 7, type: 'mc', text: 'How does magma contribute to continental movement?', options: ['It dissolves Asthenosphere', 'It rises, cools, and forms new oceanic crust that pushes plates apart', 'It speeds up solar heat absorption', 'It changes the gravity constant'], correct: 'It rises, cools, and forms new oceanic crust that pushes plates apart' },
            { id: 8, type: 'mc', text: 'Tectonic plates float and move on top of which layer?', options: ['The core', 'The asthenosphere', 'The lithosphere', 'The ocean floor'], correct: 'The asthenosphere' },
            { id: 9, type: 'mc', text: 'Which phenomenon is NOT directly explained by plate tectonics?', options: ['Earthquakes', 'Volcanic activity', 'Wind and cloud patterns', 'Mountain ranges formation'], correct: 'Wind and cloud patterns' }
        ]
    },
    'toefl-speaking-repeat': {
        title: 'TOEFL Speaking Mock 1: Listen and Repeat (Gym Orientation)',
        type: 'speaking-repeat',
        questions: [
            { id: 1, text: "Welcome to our campus gym." },
            { id: 2, text: "Cardio machines are located near the entrance." },
            { id: 3, text: "Free weights are in the back." },
            { id: 4, text: "All of our locker rooms are equipped with showers and towels." },
            { id: 5, text: "Our fitness instructors hold exercise classes over here." },
            { id: 6, text: "You can check the schedule for available classes and timings." },
            { id: 7, text: "If you have any questions, please seek assistance from the attendants." }
        ]
    },
    'toefl-speaking-interview': {
        title: 'TOEFL Speaking Mock 2: Take an Interview (Campus Academic Path)',
        type: 'speaking-interview',
        questions: [
            { id: 1, text: "Could you describe your academic background and what motivated you to apply to this university?" },
            { id: 2, text: "Do you prefer studying alone in a quiet space, or collaborating in a study group with peers? Why?" },
            { id: 3, text: "How do you manage your time when you have multiple assignments and research deadlines due in the same week?" },
            { id: 4, text: "What is your main career goal after graduating, and how do you plan to achieve it?" }
        ]
    },
    'toefl-reading': {
        title: 'TOEFL Reading Mock 1: Coral Reef Symbiosis',
        type: 'reading',
        passage: `
<p><strong>Section 1: The Reef Ecosystem</strong><br>Coral reefs, often termed the "rainforests of the sea," thrive in nutrient-poor tropical waters. Their abundance in areas devoid of substantial planktonic nutrients is an ecological paradox made possible by a delicate symbiotic relationship. This mutualistic association occurs between reef-building scleractinian corals and microscopic, single-celled algae known as zooxanthellae. The algae reside within the gastrodermal tissues of the coral polyps, protected from predators and supplied with waste compounds from the host's metabolism, such as carbon dioxide, ammonium, and phosphate.</p>

<p><strong>Section 2: Photosynthetic Exchange</strong><br>In return for shelter and nutrients, the zooxanthellae perform photosynthesis, converting solar energy into organic products. These products, which include glucose, glycerol, and amino acids, are translocated to the coral host, providing up to 90% of the animal's energy requirements. This cellular energy fuels the coral's active calcification process, enabling it to deposit calcium carbonate skeleton at rates far exceeding those of corals lacking zooxanthellae. Thus, this exchange is not merely nutritional, but the driving force behind the physical construction of the entire reef framework.</p>

<p><strong>Section 3: Bleaching Threats</strong><br>This relationship is highly sensitive to thermal variations. An increase in sea surface temperature of just one degree Celsius above the summer average can trigger coral bleaching. Under thermal stress, the photosynthetic apparatus of the zooxanthellae becomes damaged, producing toxic reactive oxygen species. To protect itself, the coral host expels the algae, losing its pigment and exposing its white calcium carbonate skeleton. If temperature levels return to normal, the corals can reacquire zooxanthellae and recover; however, prolonged thermal stress leads to host starvation, skeletal degeneration, and eventual mortality.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'The word "devoid" in Section 1 is closest in meaning to:', options: ['Lacking', 'Filled', 'Saturated', 'Supported'], correct: 'Lacking' },
            { id: 2, type: 'mc', text: 'According to Section 1, which of the following is a waste product supplied by corals to zooxanthellae?', options: ['Glucose', 'Oxygen', 'Carbon Dioxide', 'Calcium Carbonate'], correct: 'Carbon Dioxide' },
            { id: 3, type: 'mc', text: 'Why is the abundance of coral reefs in nutrient-poor waters described as a "paradox"?', options: ['Because reefs produce more nutrients than they consume', 'Because abundant life is found where few external nutrients exist', 'Because zooxanthellae are toxic to other marine life', 'Because scleractinian corals do not deposit calcium'], correct: 'Because abundant life is found where few external nutrients exist' },
            { id: 4, type: 'mc', text: 'According to Section 2, the energy provided by zooxanthellae is primarily used by corals to:', options: ['Fight off bacterial infections', 'Deposit calcium carbonate skeleton', 'Attract larval prey', 'Migrate to deeper waters'], correct: 'Deposit calcium carbonate skeleton' },
            { id: 5, type: 'mc', text: 'What is the role of solar energy in the symbiotic relationship?', options: ['It breaks down calcium carbonate', 'It triggers coral bleaching', 'It drives photosynthesis in the algae', 'It warms the gastrodermal tissues'], correct: 'It drives photosynthesis in the algae' },
            { id: 6, type: 'mc', text: 'The word "translocated" in Section 2 is closest in meaning to:', options: ['Destroyed', 'Transferred', 'Stored', 'Inhibited'], correct: 'Transferred' },
            { id: 7, type: 'mc', text: 'According to Section 3, thermal stress causes zooxanthellae to:', options: ['Multiply rapidly inside the tissue', 'Release toxic reactive oxygen species', 'Consume the host polyps', 'Shed their pigments'], correct: 'Release toxic reactive oxygen species' },
            { id: 8, type: 'mc', text: 'Coral bleaching is defined as:', options: ['The deposition of excessive calcium carbonate', 'The expulsion of zooxanthellae due to stress', 'The invasion of competitive macroalgae', 'The chemical dissolution of the reef by acid'], correct: 'The expulsion of zooxanthellae due to stress' },
            { id: 9, type: 'mc', text: 'Which of the following can be inferred from Section 3 about bleached corals?', options: ['They cannot survive if sea temperatures return to normal', 'They are permanently unable to reacquire algae', 'They are in danger of starvation if bleaching is prolonged', 'They grow faster without the algae'], correct: 'They are in danger of starvation if bleaching is prolonged' },
            { id: 10, type: 'mc', text: 'What is the main topic of Section 3?', options: ['The benefits of calcification', 'The metabolic wastes of polyps', 'The impact of temperature changes on the symbiosis', 'The classification of scleractinian corals'], correct: 'The impact of temperature changes on the symbiosis' }
        ]
    },
    'toefl-reading-urbanization': {
        title: 'TOEFL Reading Mock 2: 19th Century Urbanization and Industrialization',
        type: 'reading',
        passage: `
<p><strong>Section 1: The Steam Engine and Factory Concentration</strong><br>The shift from water power to steam power during the 19th century decoupled industrial production from rural river valleys. Steam engines allowed factories to locate in urban centers, close to transport hubs and large pools of labor. This concentration created a self-reinforcing loop: factories attracted workers, workers expanded the domestic market, and the dense population justified further infrastructure investments, such as rail terminals and gas street lighting.</p>

<p><strong>Section 2: Social Transformations and Public Health</strong><br>This rapid population influx overwhelmed municipal services. Cities grew without planning, leading to overcrowding and poorly ventilated housing tenements. Devoid of adequate sanitation, sewage systems, or clean drinking water, urban centers became breeding grounds for infectious diseases like cholera and tuberculosis. The high mortality rates in urban areas created an "urban penalty," where life expectancy was significantly lower than in rural areas, sparking the sanitarians' reform movement.</p>

<p><strong>Section 3: Technological Solutions and Policy Shift</strong><br>By the late 19th century, civil engineering and government policy intervened. Cities began constructing massive underground sewer systems and importing clean water from distant reservoirs. Furthermore, the development of public transit, including horse-drawn omnibuses and electric streetcars, allowed workers to live further from factory districts. This spatial segregation of residential and industrial zones marked the beginning of modern urban planning.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'The word "decoupled" in Section 1 is closest in meaning to:', options: ['Disconnected', 'Amplified', 'Accelerated', 'Integrated'], correct: 'Disconnected' },
            { id: 2, type: 'mc', text: 'According to Section 1, how did steam power affect factory locations?', options: ['It forced them near rural river valleys', 'It allowed them to locate in urban centers', 'It made them independent of transportation hubs', 'It reduced their dependency on manual labor'], correct: 'It allowed them to locate in urban centers' },
            { id: 3, type: 'mc', text: 'Which of the following is NOT mentioned in Section 1 as an urban infrastructure benefit?', options: ['Rail terminals', 'Gas street lighting', 'Telephone networks', 'Factory concentration'], correct: 'Telephone networks' },
            { id: 4, type: 'mc', text: 'The word "influx" in Section 2 is closest in meaning to:', options: ['Decline', 'Arrival', 'Distribution', 'Adaptation'], correct: 'Arrival' },
            { id: 5, type: 'mc', text: 'According to Section 2, what was the primary cause of the "urban penalty"?', options: ['Lack of employment opportunities', 'Lack of sanitation and spread of disease', 'The high cost of steam coal', 'The lack of public transit'], correct: 'Lack of sanitation and spread of disease' },
            { id: 6, type: 'mc', text: 'Based on Section 2, what can be inferred about life expectancy in the 19th century?', options: ['Rural areas had higher life expectancy than industrial cities', 'Sanitarians were unable to improve life expectancy', 'Tenement housing was healthier than rural cottages', 'Tuberculosis did not affect rural populations'], correct: 'Rural areas had higher life expectancy than industrial cities' },
            { id: 7, type: 'mc', text: 'According to Section 3, civil engineers addressed public health issues by:', options: ['Banning steam engines from cities', 'Building underground sewer systems', 'Demolishing all factory districts', 'Closing city gates to immigrants'], correct: 'Building underground sewer systems' },
            { id: 8, type: 'mc', text: 'What was the consequence of developing public transit systems?', options: ['It concentrated more workers inside factories', 'It allowed workers to live further away from their workplaces', 'It caused passenger queues at rail terminals', 'It eliminated the need for sewers'], correct: 'It allowed workers to live further away from their workplaces' },
            { id: 9, type: 'mc', text: 'The word "segregation" in Section 3 is closest in meaning to:', options: ['Separation', 'Cooperation', 'Improvement', 'Construction'], correct: 'Separation' },
            { id: 10, type: 'mc', text: 'What is the main theme of Section 3?', options: ['The history of horse-drawn omnibuses', 'Municipal planning and technological solutions to urban problems', 'The decline of rural industries', 'Veto thresholds in urban investments'], correct: 'Municipal planning and technological solutions to urban problems' }
        ]
    },
    'toefl-listening-tectonics': {
        title: 'TOEFL Listening Mock 1: Plate Tectonics and Continental Drift',
        type: 'listening',
        youtubeId: 'W276_VEnC4U',
        audioText: `
        Welcome back to the Geology lecture.
        Today, we are discussing the dynamic nature of Earth's lithosphere, specifically the theory of plate tectonics.
        For centuries, observers noticed that the coastlines of South America and Africa fit together like pieces of a puzzle.
        In 1912, Alfred Wegener proposed the theory of continental drift. He hypothesized that all continents were once part of a supercontinent called Pangaea.
        Wegener pointed to fossil evidence, such as matching plant and reptile fossils found on widely separated landmasses.
        However, the geological community rejected Wegener's theory because he could not identify the mechanism that drove the movement of continents. He suggested they plowed through the ocean floor, which geologists knew was physically impossible.
        It wasn't until the 1960s, with the discovery of sea-floor spreading at mid-ocean ridges, that the mechanism was found.
        Magma rises from the mantle, cools, and forms new oceanic crust, pushing the plates apart.
        This led to the modern theory of plate tectonics, where tectonic plates slide on the semi-fluid asthenosphere below.
        This process explains earthquakes, volcanic activity, and the formation of massive mountain ranges.
        That's all for today. Read chapter 5 before our lab tomorrow.
        `,
        passage: `
<p><strong>🔊 TOEFL Listening Simulation</strong><br>Click the play button below to listen to the geology lecture. Answer the multiple-choice questions on the right based on the lecture contents.</p>
        `,
        questions: [
            { id: 1, type: 'mc', text: 'What is the main topic of the lecture?', options: ['The formation of the oceans', 'The history and mechanism of plate tectonics', 'The discovery of reptile fossils', 'Volcanic eruptions in South America'], correct: 'The history and mechanism of plate tectonics' },
            { id: 2, type: 'mc', text: 'Who proposed the theory of continental drift in 1912?', options: ['Alfred Wegener', 'Sarah Smith', 'Albert Einstein', 'Planck Kilogram'], correct: 'Alfred Wegener' },
            { id: 3, type: 'mc', text: 'What is the name of the ancient supercontinent mentioned in the lecture?', options: ['Pangaea', 'Mesopotamia', 'ELECTRE', 'Asthenosphere'], correct: 'Pangaea' },
            { id: 4, type: 'mc', text: 'What fossil evidence did the lecturer mention to support Wegener\'s theory?', options: ['Ancient human bones', 'Matching plant and reptile fossils on different continents', 'Mammoth tusks in Siberia', 'Coral reef calcifications'], correct: 'Matching plant and reptile fossils on different continents' },
            { id: 5, type: 'mc', text: 'Why was Wegener\'s theory originally rejected by the geological community?', options: ['He had no fossil evidence', 'He could not provide a physical mechanism for continental movement', 'He was not a university graduate', 'His measurements were in cubits instead of meters'], correct: 'He could not provide a physical mechanism for continental movement' },
            { id: 6, type: 'mc', text: 'What discovery in the 1960s provided the mechanism for tectonic plate movement?', options: ['Mid-ocean magnetic anomalies', 'Sea-floor spreading at mid-ocean ridges', 'Deep sea trenches in South America', 'The speed of light constant'], correct: 'Sea-floor spreading at mid-ocean ridges' },
            { id: 7, type: 'mc', text: 'How is new oceanic crust formed?', options: ['By solar energy calcifying sea salt', 'By cooling magma rising from the mantle', 'By tectonic plates colliding', 'By the dissolution of calcium carbonate'], correct: 'By cooling magma rising from the mantle' },
            { id: 8, type: 'mc', text: 'Tectonic plates slide on top of which semi-fluid layer of the Earth?', options: ['The lithosphere', 'The core', 'The asthenosphere', 'The gastrodermal tissue'], correct: 'The asthenosphere' },
            { id: 9, type: 'mc', text: 'Which geological phenomenon is NOT mentioned as being explained by plate tectonics?', options: ['Earthquakes', 'Volcanic activity', 'Mountain ranges', 'Wind patterns'], correct: 'Wind patterns' },
        ]
    }
};

// ==========================================================================
// DATA: WRITING PROMPTS DATABASE
// ==========================================================================
const WRITING_PROMPTS = {
    'ielts': {
        'task1': [
            { id: 'ielts-t1-pe', category: '📦 Engenharia de Produção', title: 'Assembly Line Layout Comparison', description: 'The bar chart below shows the average cycle time (in minutes) and defect rates across four different assembly line layouts (Layout A, B, C, and D) in a manufacturing plant. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.' },
            { id: 'ielts-t1-tech', category: '💻 Tecnologia', title: 'Internet Adoption Rates (2015-2025)', description: 'The line graph shows the percentage of the population using the internet in three different countries (Country A, Country B, and Country C) between 2015 and 2025. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.' },
            { id: 'ielts-t1-sports', category: '⚽ Esporte & Futebol', title: 'Football Stadium Attendance Data', description: 'The table below shows the average weekly stadium attendance and ticket price changes for five major football clubs in Europe during the 2024/2025 season. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.' },
            { id: 'ielts-t1-politics', category: '🏛️ Política', title: 'Voter Turnout by Demographics', description: 'The chart below details the voter turnout percentages across different age groups in three municipal elections between 2018 and 2026. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.' }
        ],
        'task2': [
            { id: 'ielts-t2-ai', category: '🤖 Inteligência Artificial', title: 'AI and Intellectual Work', description: 'Many people believe that artificial intelligence will eventually replace human researchers and academic writers. Others argue that AI will only serve as a tool to enhance human productivity. Discuss both views and give your opinion.' },
            { id: 'ielts-t2-pe', category: '📦 Engenharia de Produção', title: 'Automation in Industry 4.0', description: 'The rapid advancement of automation and robotics in production lines has significantly reduced the demand for manual labor. Some argue this leads to high unemployment, while others believe it creates higher-skilled job opportunities. Discuss both views and give your opinion.' },
            { id: 'ielts-t2-career', category: '💼 Carreira & Educação', title: 'Specialist vs. Generalist Careers', description: 'Some people believe that in today\'s competitive job market, it is better to specialize in a narrow academic field. Others argue that a broad, generalist background is more advantageous for long-term career growth. Discuss both views and give your opinion.' },
            { id: 'ielts-t2-sports', category: '⚽ Esporte & Futebol', title: 'Commercialization of Football', description: 'Modern football has become a multi-billion dollar business, with top clubs paying massive transfer fees and salaries to players. Some believe this ruins the integrity of the sport, while others argue it is a natural result of its global popularity. To what extent do you agree or disagree?' },
            { id: 'ielts-t2-politics', category: '🏛️ Política', title: 'Social Media and Democracy', description: 'Political campaigns now rely heavily on social media to influence voters. Some people think that this has democratized political debate, while others believe it has led to polarization and the spread of misinformation. Discuss both views and give your opinion.' }
        ]
    },
    'toefl': {
        'task1': [
            { id: 'toefl-t1-ai', category: '🤖 Inteligência Artificial', title: 'Machine Translation vs. Human Translators', description: 'Reading Passage:\nMachine translation algorithms have reached a point where they can translate complex texts in seconds. Proponents argue that human translators will soon become obsolete as neural networks continue to improve in context and idiom detection.\n\nLecture Summary:\nThe professor refutes this claim, arguing that translation is a cultural and contextual act, not just word replacement. She gives examples of marketing slogans and legal contracts where subtle cultural nuances cannot be captured by machines, making human oversight indispensable.' },
            { id: 'toefl-t1-career', category: '💼 Carreira & Educação', title: 'The 4-Day Workweek Debate', description: 'Reading Passage:\nStudies show that transitioning to a four-day workweek improves employee satisfaction and reduces overhead costs for businesses. It is argued that productivity remains stable or even increases because workers are better rested.\n\nLecture Summary:\nThe professor challenges this view, highlighting that a four-day workweek often forces employees to compress 40 hours of work into four 10-hour days. This causes physical and mental fatigue, leading to higher error rates in production environments, particularly in engineering and manufacturing fields.' },
            { id: 'toefl-t1-pe', category: '📦 Engenharia de Produção', title: 'Just-in-Time (JIT) Manufacturing', description: 'Reading Passage:\nJust-in-Time (JIT) manufacturing is a production strategy that reduces inventory costs by receiving goods only as they are needed in the production process. This minimizes warehouse overhead and waste.\n\nLecture Summary:\nThe professor disputes these benefits. She argues that JIT makes companies extremely vulnerable to supply chain disruptions, such as transport strikes or natural disasters. When a single component is delayed, the entire factory production halts, causing massive financial losses.' }
        ],
        'task2': [
            { 
                id: 'toefl-t2-ai', 
                category: '🤖 Inteligência Artificial', 
                title: 'AI in the Classroom', 
                description: 'Academic Discussion:\nYour professor is asking for your opinion on the following topic:\n"Some universities are planning to integrate generative AI tools into their core writing curriculum, while others want to ban them completely to prevent plagiarism. Which approach do you think is better for students\' long-term cognitive development?"',
                professorName: 'Dr. Margaret Henderson',
                topic: 'Artificial Intelligence in University Writing',
                professorPrompt: 'Some universities are planning to integrate generative AI tools into their core writing curriculum, while others want to ban them completely to prevent plagiarism. Which approach do you think is better for students\' long-term cognitive development?',
                student1Name: 'Kelly',
                student1Post: 'Integrating AI is better. AI is the future, and students need to learn how to use it as a tool, just like calculators or search engines. Banning it is completely unrealistic in modern education.',
                student2Name: 'Paul',
                student2Post: 'I disagree. If students rely on AI to write, they won\'t learn critical thinking, structuring arguments, or vocabulary precision. We should definitely ban it for first-year courses.'
            },
            { 
                id: 'toefl-t2-sports', 
                category: '⚽ Esporte & Futebol', 
                title: 'Funding Sports vs. Academic Research', 
                description: 'Academic Discussion:\nYour professor is asking for your opinion on the following topic:\n"Many universities allocate significant portions of their budget to athletic departments and sports facilities, sometimes more than they spend on academic research laboratories. Do you think this is a justifiable allocation of university resources?"',
                professorName: 'Dr. Arthur Diaz',
                topic: 'University Funding Allocation',
                professorPrompt: 'Many universities allocate significant portions of their budget to athletic departments and sports facilities, sometimes more than they spend on academic research laboratories. Do you think this is a justifiable allocation of university resources?',
                student1Name: 'Kelly',
                student1Post: 'Yes, sports bring massive publicity, attract top applicants, and build a strong sense of community on campus. This indirect revenue helps fund the university overall and improves student life.',
                student2Name: 'Paul',
                student2Post: 'I think it\'s unjustifiable. A university\'s primary mission is education and research. Spending millions on stadiums while research labs lack basic equipment is a compromise of academic values.'
            },
            { 
                id: 'toefl-t2-politics', 
                category: '🏛️ Política', 
                title: 'Government Funding for Science', 
                description: 'Academic Discussion:\nYour professor is asking for your opinion on the following topic:\n"Should governments prioritize funding for basic scientific research with no immediate commercial value, or should they only support projects that have practical, commercial applications for the economy?"',
                professorName: 'Dr. Evelyn Sanders',
                topic: 'Government Priorities in Scientific Funding',
                professorPrompt: 'Should governments prioritize funding for basic scientific research with no immediate commercial value, or should they only support projects that have practical, commercial applications for the economy?',
                student1Name: 'Kelly',
                student1Post: 'Governments should support projects with immediate commercial value. It creates jobs, stimulates the economy, and provides taxpayers with concrete benefits quickly without years of waiting.',
                student2Name: 'Paul',
                student2Post: 'Actually, basic scientific research is the foundation of all future technology. Breakthroughs like the internet or quantum computing were developed from basic research with no initial commercial goal.'
            },
            { 
                id: 'toefl-t2-career', 
                category: '💼 Carreira & Educação', 
                title: 'Startup vs. Large Corporation', 
                description: 'Academic Discussion:\nYour professor is asking for your opinion on the following topic:\n"When graduating from university, is it better for a young professional\'s career to start working in a small startup environment, or is it more advantageous to join a large, established multinational corporation? What are the main benefits of your choice?"',
                professorName: 'Dr. Marcus Vance',
                topic: 'First Job Choice: Startup vs. Multinationals',
                professorPrompt: 'When graduating from university, is it better for a young professional\'s career to start working in a small startup environment, or is it more advantageous to join a large, established multinational corporation? What are the main benefits of your choice?',
                student1Name: 'Kelly',
                student1Post: 'Startups are much better because you wear many hats, learn how to build things from scratch, and have rapid career growth and decision-making opportunities.',
                student2Name: 'Paul',
                student2Post: 'A large multinational is a safer bet. They offer structured training programs, mentorship from experienced managers, and a prestigious brand name on your resume.'
            }
        ]
    }
};

function updatePromptList() {
    const mode = document.getElementById('writing-mode-selector').value;
    const task = document.getElementById('writing-task-selector').value;
    const promptSelector = document.getElementById('writing-prompt-selector');
    const promptText = document.getElementById('writing-prompt-text');

    if (!promptSelector) return;

    // Get prompts for current mode and task
    const prompts = (WRITING_PROMPTS[mode] && WRITING_PROMPTS[mode][task]) ? WRITING_PROMPTS[mode][task] : [];

    // Clear and build the selector options
    promptSelector.innerHTML = '<option value="custom">-- Custom Prompt (Escreva seu próprio tema) --</option>';

    // Group prompts by category
    const grouped = {};
    prompts.forEach(p => {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
    });

    // Append optgroups and options
    for (const category in grouped) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        grouped[category].forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.title;
            optgroup.appendChild(opt);
        });
        promptSelector.appendChild(optgroup);
    }

    // Set value to custom by default or select first prompt
    promptSelector.value = 'custom';
    promptText.value = '';
    promptText.placeholder = 'Digite ou edite o enunciado da sua redação aqui...';
}

// ==========================================================================
// MOCK DATA GENERATION (FOR HISTORICAL GRAPHS & DEMO FIRST USE)
// ==========================================================================

function generateDemoHistoricalData() {
    const demoStats = [
        { date: "2026-05-18", speaking: 6.0, writing: 5.5, reading: 6.5, listening: 6.0 },
        { date: "2026-05-25", speaking: 6.0, writing: 6.0, reading: 7.0, listening: 6.5 },
        { date: "2026-06-01", speaking: 6.5, writing: 6.0, reading: 7.5, listening: 7.0 },
        { date: "2026-06-08", speaking: 6.5, writing: 6.5, reading: 8.0, listening: 7.5 },
        { date: "2026-06-15", speaking: 7.0, writing: 7.0, reading: 8.5, listening: 8.0 }
    ];

    const demoMocks = [
        { date: "2026-05-18", type: "ielts-reading", scoreRaw: 6, scoreBand: 6.5 },
        { date: "2026-05-25", type: "ielts-listening", scoreRaw: 7, scoreBand: 6.5 },
        { date: "2026-06-01", type: "ielts-reading-agriculture", scoreRaw: 8, scoreBand: 7.5 },
        { date: "2026-06-08", type: "ielts-listening-library", scoreRaw: 9, scoreBand: 8.0 },
        { date: "2026-06-15", type: "ielts-reading-or", scoreRaw: 10, scoreBand: 9.0 }
    ];

    const demoWritings = [
        { date: "2026-05-19", mode: "ielts", task: "task2", prompt: "Some people think that scientific research should be funded by governments, while others believe private companies should fund it.", band: "5.5" },
        { date: "2026-05-26", mode: "ielts", task: "task1", prompt: "The table below shows the percentage of industrial investments in three major sectors...", band: "6.0" },
        { date: "2026-06-02", mode: "toefl", task: "task2", prompt: "Academic Discussion: Is learning languages obsolete in the future?", band: "20/30" },
        { date: "2026-06-09", mode: "ielts", task: "task2", prompt: "Some people think that scientific research should be funded by governments...", band: "6.5" },
        { date: "2026-06-16", mode: "ielts", task: "task2", prompt: "Some people think that scientific research should be funded by governments...", band: "7.0" }
    ];

    const demoSpeaking = [
        { date: "2026-05-18", scenarioName: "Daily Life & Routines", turns: 4, score: 6.0 },
        { date: "2026-05-25", scenarioName: "Job Interview Simulation", turns: 6, score: 6.0 },
        { date: "2026-06-01", scenarioName: "Expressing Opinions", turns: 8, score: 6.5 },
        { date: "2026-06-08", scenarioName: "University Lecture Discussion", turns: 5, score: 6.5 },
        { date: "2026-06-15", scenarioName: "Describing Charts Practice", turns: 7, score: 7.0 }
    ];

    statsHistory = demoStats;
    mockHistory = demoMocks;
    writingHistory = demoWritings;
    speakingHistory = demoSpeaking;
    writingCount = demoWritings.length;

    // Simulate flashcard progress for demo data
    deck = deck.map((card, idx) => {
        const cloned = { ...card };
        if (idx < 25) {
            cloned.interval = 10; // Mastered (interval > 8)
            cloned.nextDue = Date.now() + 10 * 24 * 60 * 60 * 1000;
        } else if (idx < 80) {
            cloned.interval = 4; // Learning (interval <= 8)
            cloned.nextDue = Date.now() + 4 * 24 * 60 * 60 * 1000;
        } else {
            cloned.interval = 1; // New
            cloned.nextDue = Date.now();
        }
        return cloned;
    });
    saveDeck();

    localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));
    localStorage.setItem('cerebrum_mock_history', JSON.stringify(mockHistory));
    localStorage.setItem('cerebrum_writing_history', JSON.stringify(writingHistory));
    localStorage.setItem('cerebrum_speaking_history', JSON.stringify(speakingHistory));
    localStorage.setItem('cerebrum_writing_count', writingCount);

    // Re-render charts & table
    updateKPIs();
    renderScoreChart();
    renderVocabChart();
    renderHistoryTable();

    alert('Demo historical stats successfully populated! Visit the Evolution tab to inspect the charts and history table.');
}

// ==========================================================================
// INITIALIZATION AND HANDLERS
// ==========================================================================

function initTabSystem() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            
            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(`tab-${tabName}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            // Tab hooks
            if (tabName === 'vocabulary') {
                showNextCard();
                // Sync due counts
                updateStudyPlanUI();
            } else if (tabName === 'evolution') {
                renderScoreChart();
                renderVocabChart();
                updateKPIs();
                renderHistoryTable();
            } else if (tabName === 'studyplan') {
                updateStudyPlanUI();
            }

            // Auto-close mobile sidebar when navigation occurs
            const sidebar = document.getElementById('app-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
            if (overlay && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        });
    });
}

function initMobileMenu() {
    const toggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}


// ==========================================================================
// EVOLUTION & CHARTS MANAGEMENT (CHART.JS)
// ==========================================================================

let scoreChartInstance = null;
let vocabChartInstance = null;

function loadStatsHistory() {
    const savedStats = localStorage.getItem('cerebrum_stats_history');
    const savedMocks = localStorage.getItem('cerebrum_mock_history');
    const savedWCount = localStorage.getItem('cerebrum_writing_count');
    const savedWHistory = localStorage.getItem('cerebrum_writing_history');
    const savedSpeaking = localStorage.getItem('cerebrum_speaking_history');

    if (savedStats) statsHistory = JSON.parse(savedStats);
    if (savedMocks) mockHistory = JSON.parse(savedMocks);
    if (savedWCount) writingCount = parseInt(savedWCount);
    if (savedWHistory) writingHistory = JSON.parse(savedWHistory);
    if (savedSpeaking) speakingHistory = JSON.parse(savedSpeaking);
}

function updateKPIs() {
    // 1. Overall estimated band score (average of last stats point)
    const overallValue = document.getElementById('kpi-overall');
    if (statsHistory.length > 0) {
        const last = statsHistory[statsHistory.length - 1];
        const average = (last.speaking + last.writing + last.reading + last.listening) / 4;
        // Round to nearest 0.5 for IELTS standard
        const rounded = Math.round(average * 2) / 2;
        overallValue.textContent = rounded.toFixed(1);
    } else {
        overallValue.textContent = '--';
    }

    // 2. Flashcard Count & Mastery
    const studiedCount = deck.filter(c => c.interval > 1).length;
    const masteredCount = deck.filter(c => c.interval > 8).length;
    document.getElementById('kpi-vocab-count').textContent = studiedCount;
    const percentage = deck.length > 0 ? Math.round((masteredCount / deck.length) * 100) : 0;
    document.getElementById('kpi-vocab-sub').textContent = `${masteredCount} mastered | ${percentage}% of deck`;

    // 3. Mocks & Writing count
    document.getElementById('kpi-mocks-count').textContent = mockHistory.length;
    document.getElementById('kpi-writings-count').textContent = writingCount;
}

function renderScoreChart() {
    const ctx = document.getElementById('scoreEvolutionChart');
    if (!ctx) return;

    if (scoreChartInstance) {
        scoreChartInstance.destroy();
    }

    // Prepare labels and datasets
    const labels = statsHistory.map(pt => {
        // format date from YYYY-MM-DD to DD/MM
        const parts = pt.date.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : pt.date;
    });

    const datasetSpeaking = statsHistory.map(pt => pt.speaking);
    const datasetWriting = statsHistory.map(pt => pt.writing);
    const datasetReading = statsHistory.map(pt => pt.reading);
    const datasetListening = statsHistory.map(pt => pt.listening);

    scoreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Speaking', data: datasetSpeaking, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.2, fill: false },
                { label: 'Writing', data: datasetWriting, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', tension: 0.2, fill: false },
                { label: 'Reading', data: datasetReading, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.2, fill: false },
                { label: 'Listening', data: datasetListening, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.2, fill: false }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 1,
                    max: 9,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { labels: { color: '#f3f4f6' } }
            }
        }
    });
}

function renderVocabChart() {
    const ctx = document.getElementById('vocabDistributionChart');
    if (!ctx) return;

    if (vocabChartInstance) {
        vocabChartInstance.destroy();
    }

    // Classify card interval
    let countNew = 0;
    let countLearning = 0;
    let countMastered = 0;

    const now = Date.now();
    deck.forEach(card => {
        if (!card.interval || card.interval === 1) {
            countNew++;
        } else if (card.interval <= 8) {
            countLearning++;
        } else {
            countMastered++;
        }
    });

    vocabChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['New / Unseen', 'Learning', 'Mastered (Interval > 8d)'],
            datasets: [{
                data: [countNew, countLearning, countMastered],
                backgroundColor: ['#6b7280', '#3b82f6', '#10b981'],
                borderWidth: 1,
                borderColor: '#0f141f'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f3f4f6' }
                }
            }
        }
    });
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-log-tbody');
    if (!tbody) return;

    // Combine mocks, writings, and speaking sessions
    const items = [];

    mockHistory.forEach(m => {
        const testData = MOCK_TESTS[m.type];
        const title = testData ? testData.title : m.type;
        items.push({
            date: m.date,
            type: 'Mock Test',
            name: title,
            score: `${m.scoreRaw}/10 (Score: ${m.scoreBand})`
        });
    });

    writingHistory.forEach(w => {
        let taskName = w.task === 'task1' ? 'Task 1' : 'Task 2';
        let activityLabel = `${w.mode.toUpperCase()} Writing (${taskName})`;
        items.push({
            date: w.date,
            type: activityLabel,
            name: w.prompt,
            score: `Band: ${w.band}`
        });
    });

    speakingHistory.forEach(s => {
        items.push({
            date: s.date,
            type: 'Speaking Session',
            name: `Scenario: ${s.scenarioName} (Turns: ${s.turns})`,
            score: `Est. Band: ${s.score.toFixed(1)}`
        });
    });

    // Sort by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No history registered yet. Start practicing!</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        return `
            <tr>
                <td>${item.date}</td>
                <td><strong style="color: var(--accent-blue);">${item.type}</strong></td>
                <td title="${item.name}">${item.name}</td>
                <td><strong style="color: var(--accent-green);">${item.score}</strong></td>
            </tr>
        `;
    }).join('');
}

// ==========================================================================
// SPEECH SYSTEMS (STT & TTS) — Voice-First Conversation Loop
// ==========================================================================

function setConversationState(newState) {
    conversationState = newState;
    const stateIndicator = document.getElementById('conversation-state');
    const micBtn = document.getElementById('mic-btn');
    const interimDiv = document.getElementById('interim-transcript');
    const waveContainer = document.getElementById('recording-wave');

    if (!stateIndicator) return;

    switch (newState) {
        case 'IDLE':
            stateIndicator.className = 'conversation-state state-idle';
            stateIndicator.innerHTML = '<span class="state-dot"></span> Tap the mic to start speaking';
            if (micBtn) micBtn.classList.remove('recording');
            if (waveContainer) waveContainer.style.display = 'none';
            if (interimDiv) { interimDiv.style.display = 'none'; interimDiv.textContent = ''; }
            break;
        case 'LISTENING':
            stateIndicator.className = 'conversation-state state-listening';
            stateIndicator.innerHTML = '<span class="state-dot"></span> Listening...';
            if (micBtn) micBtn.classList.add('recording');
            if (waveContainer) waveContainer.style.display = 'flex';
            if (interimDiv) interimDiv.style.display = 'block';
            break;
        case 'PROCESSING':
            stateIndicator.className = 'conversation-state state-processing';
            stateIndicator.innerHTML = '<span class="state-dot"></span> Analyzing your response...';
            if (micBtn) micBtn.classList.remove('recording');
            if (waveContainer) waveContainer.style.display = 'none';
            if (interimDiv) { interimDiv.style.display = 'none'; interimDiv.textContent = ''; }
            break;
        case 'AI_SPEAKING':
            stateIndicator.className = 'conversation-state state-speaking';
            stateIndicator.innerHTML = '<span class="state-dot"></span> AI is speaking...';
            if (micBtn) micBtn.classList.remove('recording');
            if (waveContainer) waveContainer.style.display = 'none';
            break;
    }
}

function initSpeechSystems() {
    const voiceSelect = document.getElementById('settings-tts-voice');
    
    function populateVoices() {
        if (!window.speechSynthesis) return;
        const voices = window.speechSynthesis.getVoices();
        voiceSelect.innerHTML = '<option value="">-- System Default Voice --</option>';
        
        voices.forEach(voice => {
            if (voice.lang.startsWith('en')) {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (config.voiceName === voice.name) option.selected = true;
                voiceSelect.appendChild(option);
            }
        });
    }

    populateVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = populateVoices;

    // --- Voice-First Speech Recognition ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isRecording = true;
            setConversationState('LISTENING');
            interimTranscript = '';
        };

        recognition.onend = () => {
            isRecording = false;
            if (conversationState === 'LISTENING' && handsFreeMode) {
                setTimeout(() => {
                    try { if (recognition) recognition.start(); } catch (e) { /* already started */ }
                }, 300);
            } else if (conversationState === 'LISTENING') {
                setConversationState('IDLE');
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // These are normal — browser timed out or user stopped
                return;
            }
            isRecording = false;
            setConversationState('IDLE');
        };

        recognition.onresult = (event) => {
            clearTimeout(silenceTimer);

            let finalTranscript = '';
            let currentInterim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    // Accept all final results (removed confidence check to better understand non-native accents)
                    finalTranscript += result[0].transcript;
                } else {
                    currentInterim += result[0].transcript;
                }
            }

            if (finalTranscript) {
                interimTranscript += (interimTranscript ? ' ' : '') + finalTranscript.trim();
            }

            // Show live interim transcript
            const interimDiv = document.getElementById('interim-transcript');
            if (interimDiv) {
                const displayText = interimTranscript + (currentInterim ? ' ' + currentInterim : '');
                interimDiv.textContent = displayText || 'Listening...';
                interimDiv.style.display = displayText ? 'block' : 'none';
            }

            // Also update the text input for visibility
            const textInput = document.getElementById('chat-text-input');
            if (textInput) {
                textInput.value = interimTranscript + (currentInterim ? ' ' + currentInterim : '');
            }

            // Silence debounce: auto-send after config.silenceTimeout ms of no new speech
            silenceTimer = setTimeout(() => {
                const fullText = interimTranscript.trim();
                if (fullText.length > 0) {
                    // Stop recognition before sending
                    try { if (recognition) recognition.stop(); } catch (e) { /* ignore */ }
                    isRecording = false;
                    
                    // Auto-send the message
                    handleSendMessage(fullText);
                    interimTranscript = '';
                    
                    // Clear the input
                    if (textInput) textInput.value = '';
                    if (interimDiv) { interimDiv.textContent = ''; interimDiv.style.display = 'none'; }
                }
            }, config.silenceTimeout || 2500);
        };
    }

    // Mic button handler
    document.getElementById('mic-btn').addEventListener('click', () => {
        if (!recognition) {
            alert('Speech Recognition is not supported. Use Chrome or Edge.');
            return;
        }
        
        if (conversationState === 'AI_SPEAKING') {
            // Stop AI from speaking and go idle
            window.speechSynthesis.cancel();
            setConversationState('IDLE');
            return;
        }

        if (isRecording) {
            // Stop recording — send whatever we have
            clearTimeout(silenceTimer);
            try { recognition.stop(); } catch (e) { /* ignore */ }
            isRecording = false;
            
            const fullText = interimTranscript.trim();
            if (fullText.length > 0) {
                handleSendMessage(fullText);
                interimTranscript = '';
                const textInput = document.getElementById('chat-text-input');
                if (textInput) textInput.value = '';
            } else {
                setConversationState('IDLE');
            }
        } else {
            // Start recording
            interimTranscript = '';
            try { recognition.start(); } catch (e) {
                console.warn('Could not start recognition:', e);
            }
        }
    });

    // Hands-free toggle
    const handsFreeBtn = document.getElementById('hands-free-toggle');
    if (handsFreeBtn) {
        handsFreeBtn.addEventListener('click', () => {
            if (!recognition) {
                alert('Speech Recognition is not supported. Use Chrome or Edge.');
                return;
            }
            handsFreeMode = !handsFreeMode;
            handsFreeBtn.classList.toggle('active', handsFreeMode);
            handsFreeBtn.innerHTML = handsFreeMode 
                ? '🔄 Hands-Free: ON' 
                : '🔄 Hands-Free: OFF';
            
            if (handsFreeMode && conversationState === 'IDLE') {
                interimTranscript = '';
                try { recognition.start(); } catch (e) { /* ignore */ }
            }
        });
    }
}

function speakText(text, onEndCallback = null, isFlashcard = false) {
    if (!window.speechSynthesis) {
        if (onEndCallback) onEndCallback();
        return;
    }
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = config.rate;
    
    // Chrome retorna array vazio em getVoices() se chamado antes de onvoiceschanged
    const selectedVoice = findVoice(config.voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;

    if (!isFlashcard) {
        setConversationState('AI_SPEAKING');
    }

    utterance.onend = () => {
        if (onEndCallback) {
            onEndCallback();
        }
        if (!isFlashcard) {
            // In hands-free mode, auto-resume listening after AI finishes
            if (handsFreeMode && conversationState === 'AI_SPEAKING') {
                interimTranscript = '';
                try { recognition.start(); } catch (e) { /* ignore */ }
            }
            setConversationState('IDLE');
        }
    };

    utterance.onerror = () => {
        if (!isFlashcard) {
            setConversationState('IDLE');
        }
    };

    window.speechSynthesis.speak(utterance);
}

function findVoice(preferredName) {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (preferredName) {
        const match = voices.find(v => v.name === preferredName);
        if (match) return match;
    }
    return voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || null;
}

// ==========================================================================
// GEMINI API GATEWAY
// ==========================================================================

// Helper for API fetch with fallback to a Lite model on high demand / overload errors
async function fetchWithRetryAndFallback(url, options, maxRetries = 2, initialDelay = 1000) {
    let currentUrl = url;
    let retries = 0;
    let fallbackAttempted = false;

    while (true) {
        try {
            const response = await fetch(currentUrl, options);
            if (!response.ok) {
                let errorMessage = '';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || '';
                } catch (e) {
                    errorMessage = `HTTP Error ${response.status}`;
                }

                const isTransient = response.status === 429 || response.status === 503 ||
                                    errorMessage.toLowerCase().includes('high demand') ||
                                    errorMessage.toLowerCase().includes('overloaded') ||
                                    errorMessage.toLowerCase().includes('limit') ||
                                    errorMessage.toLowerCase().includes('quota') ||
                                    errorMessage.toLowerCase().includes('try again later');

                if (isTransient) {
                    if (retries < maxRetries) {
                        retries++;
                        const delay = initialDelay * Math.pow(2, retries - 1);
                        console.warn(`Transient error (${response.status}: ${errorMessage}). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    } else if (!fallbackAttempted && !currentUrl.includes('flash-lite')) {
                        fallbackAttempted = true;
                        retries = 0;
                        console.warn(`Model overloaded. Falling back to gemini-3.1-flash-lite...`);
                        currentUrl = currentUrl.replace(/\/models\/[^:]+:/, '/models/gemini-3.1-flash-lite:');
                        continue;
                    }
                }
                throw new Error(errorMessage || `HTTP Error ${response.status}`);
            }
            return response;
        } catch (error) {
            const isTransientError = error.message.toLowerCase().includes('fetch') || 
                                     error.message.toLowerCase().includes('network') ||
                                     error.message.toLowerCase().includes('demand') ||
                                     error.message.toLowerCase().includes('busy');

            if (isTransientError && retries < maxRetries) {
                retries++;
                const delay = initialDelay * Math.pow(2, retries - 1);
                console.warn(`Execution error: ${error.message}. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else if (isTransientError && !fallbackAttempted && !currentUrl.includes('flash-lite')) {
                fallbackAttempted = true;
                retries = 0;
                console.warn(`Execution failed. Falling back to gemini-3.1-flash-lite...`);
                currentUrl = currentUrl.replace(/\/models\/[^:]+:/, '/models/gemini-3.1-flash-lite:');
                continue;
            }
            throw error;
        }
    }
}

// Original single-turn call (used by Writing Arena, Mock Tests, etc.)
async function callGemini(systemPrompt, userPrompt) {
    if (!config.apiKey || config.apiKey.trim() === '') {
        throw new Error('API_KEY_MISSING');
    }

    const modelName = config.model.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
    
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [
                    { text: `${systemPrompt}\n\nUser Input:\n${userPrompt}` }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7
        }
    };

    const response = await fetchWithRetryAndFallback(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    
    let cleanText = resultText.trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/g, '').replace(/```$/g, '').trim();
    }
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.error('Failed to parse Gemini response as JSON. Raw text:', resultText);
        return {
            response: resultText,
            grammar: "Could not parse detailed evaluation.",
            collocations: "Could not parse recommendations."
        };
    }
}

// Multi-turn conversation call (used by Chat Room)
async function callGeminiChat(systemPrompt, conversationHistory) {
    if (!config.apiKey || config.apiKey.trim() === '') {
        throw new Error('API_KEY_MISSING');
    }

    const modelName = config.model.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
    
    if (conversationHistory.length === 0) {
        return callGemini(systemPrompt, '(Start the conversation)');
    }

    // Injeta o system prompt na primeira mensagem 'user' do historico
    const contents = conversationHistory.map((msg, idx) => {
        if (idx === 0 && msg.role === 'user') {
            return {
                role: 'user',
                parts: [{ text: `[System Instructions]\n${systemPrompt}\n\n[Conversation so far]\n${msg.parts[0].text}` }]
            };
        }
        return msg;
    });

    const requestBody = {
        contents: contents,
        generationConfig: { 
            temperature: 0.8 
        }
    };

    const response = await fetchWithRetryAndFallback(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    
    let cleanText = resultText.trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/g, '').replace(/```$/g, '').trim();
    }
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.error('Failed to parse Gemini chat response. Raw text:', resultText);
        return {
            response: resultText,
            grammar: "Could not parse structured feedback.",
            collocations: "",
            pronunciation: "",
            fluencyNote: ""
        };
    }
}

// ==========================================================================
// CHAT ROOM MODULE — BeConfident-Style Conversation Engine
// ==========================================================================

function getActiveScenario() {
    return CONVERSATION_SCENARIOS.find(s => s.id === activeScenarioId) || CONVERSATION_SCENARIOS[0];
}

function initChatSystem() {
    const sendBtn = document.getElementById('chat-send-btn');
    const textInput = document.getElementById('chat-text-input');

    // Text input: Send on Enter or click
    sendBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            handleSendMessage(text);
            textInput.value = '';
        }
    });
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = textInput.value.trim();
            if (text) {
                handleSendMessage(text);
                textInput.value = '';
            }
        }
    });

    // Scenario picker: render buttons and handle selection
    renderScenarioPicker();

    // Quick replies: delegate click handler
    const quickRepliesContainer = document.getElementById('quick-replies');
    if (quickRepliesContainer) {
        quickRepliesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-reply-btn');
            if (btn) {
                const text = btn.textContent;
                handleSendMessage(text);
            }
        });
    }

    // Load initial scenario
    loadScenario(activeScenarioId);
}

function renderScenarioPicker() {
    const container = document.getElementById('scenario-picker');
    if (!container) return;

    container.innerHTML = CONVERSATION_SCENARIOS.map(s => `
        <button class="scenario-card ${s.id === activeScenarioId ? 'active' : ''}" data-scenario="${s.id}" title="${s.description}">
            <span class="scenario-emoji">${s.emoji}</span>
            <span class="scenario-name">${s.name}</span>
        </button>
    `).join('');

    container.addEventListener('click', (e) => {
        const card = e.target.closest('.scenario-card');
        if (!card) return;
        const scenarioId = card.dataset.scenario;
        if (scenarioId === activeScenarioId) return;

        // Update active state
        container.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        loadScenario(scenarioId);
    });
}

function loadScenario(scenarioId) {
    const scenario = CONVERSATION_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    activeScenarioId = scenarioId;
    sessionVocabulary = new Set();
    sessionFillerCount = 0;
    sessionTurnCount = 0;
    sessionStartTime = null;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    if (recognition && isRecording) {
        try { recognition.stop(); } catch (e) { /* ignore */ }
    }
    setConversationState('IDLE');

    const chatLog = document.getElementById('chat-log');
    
    // Check if there is saved chat history for this scenario
    const savedContents = localStorage.getItem(`cerebrum_chat_contents_${scenarioId}`);
    const savedHtml = localStorage.getItem(`cerebrum_chat_html_${scenarioId}`);

    let loadSuccess = false;
    if (savedContents && savedHtml) {
        try {
            chatContents = JSON.parse(savedContents);
            chatLog.innerHTML = savedHtml;
            chatLog.scrollTop = chatLog.scrollHeight;
            
            // Restore turns count from loaded context
            sessionTurnCount = Math.floor(chatContents.filter(c => c.role === 'user').length);
            
            // Hide quick replies since conversation is already in progress
            renderQuickReplies([]);
            loadSuccess = true;
        } catch (e) {
            console.error('Error loading saved chat history:', e);
        }
    }

    if (!loadSuccess) {
        chatContents = [];
        
        // Render starter message
        chatLog.innerHTML = `
            <div class="message system">
                <div class="message-sender">${scenario.emoji} AI Partner</div>
                <div class="message-text">${scenario.starterMessage}</div>
            </div>
        `;

        // Gemini API exige que contents comece com role 'user' e alterne.
        // Iniciamos com uma mensagem user explicando o cenario + starter do modelo.
        const starterJson = JSON.stringify({ response: scenario.starterMessage, grammar: '', collocations: '', pronunciation: '', fluencyNote: '' });
        chatContents.push(
            {
                role: 'user',
                parts: [{ text: `[Conversation starter] The assistant greeted with: "${scenario.starterMessage}"` }]
            },
            {
                role: 'model',
                parts: [{ text: starterJson }]
            }
        );

        // Save new scenario initial chat state
        saveChatHistory();

        // Render quick reply suggestions
        renderQuickReplies(scenario.suggestedReplies);

        // Speak the starter message
        speakText(scenario.starterMessage);
    }

    // Reset feedback sidebar
    resetFeedbackSidebar();
}

function renderQuickReplies(replies) {
    const container = document.getElementById('quick-replies');
    if (!container) return;

    if (!replies || replies.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = replies.map(r => 
        `<button class="quick-reply-btn">${r}</button>`
    ).join('');
}

function resetFeedbackSidebar() {
    const transcription = document.getElementById('feedback-transcription');
    const grammar = document.getElementById('feedback-grammar');
    const collocations = document.getElementById('feedback-collocations');
    const pronunciation = document.getElementById('feedback-pronunciation');
    const fluencyMeter = document.getElementById('feedback-fluency');
    const vocabUsed = document.getElementById('feedback-vocab-used');

    if (transcription) transcription.innerHTML = '<span class="placeholder">Awaiting speech input...</span>';
    if (grammar) grammar.innerHTML = '<span class="placeholder">No issues detected yet.</span>';
    if (collocations) collocations.innerHTML = '<span class="placeholder">Suggestions will appear here.</span>';
    if (pronunciation) pronunciation.innerHTML = '<span class="placeholder">Speak to get pronunciation feedback.</span>';
    if (fluencyMeter) fluencyMeter.innerHTML = renderFluencyStats(0, 0, 0);
    if (vocabUsed) vocabUsed.innerHTML = '<span class="placeholder">Start speaking to track vocabulary.</span>';
}

function renderFluencyStats(turns, fillers, avgResponseTime) {
    return `
        <div class="fluency-stats">
            <div class="fluency-stat">
                <span class="fluency-label">Turns</span>
                <span class="fluency-value">${turns}</span>
            </div>
            <div class="fluency-stat">
                <span class="fluency-label">Fillers</span>
                <span class="fluency-value ${fillers > 5 ? 'warn' : ''}">${fillers}</span>
            </div>
            <div class="fluency-stat">
                <span class="fluency-label">Avg Response</span>
                <span class="fluency-value">${avgResponseTime > 0 ? avgResponseTime.toFixed(1) + 's' : '--'}</span>
            </div>
        </div>
    `;
}

function trackFluency(messageText) {
    sessionTurnCount++;
    
    // Count filler words
    const lowerText = messageText.toLowerCase();
    FILLER_WORDS.forEach(filler => {
        const regex = new RegExp('\\b' + filler.replace(/\s+/g, '\\s+') + '\\b', 'gi');
        const matches = lowerText.match(regex);
        if (matches) sessionFillerCount += matches.length;
    });

    // Track vocabulary (words 4+ chars, exclude common words)
    const commonWords = new Set(['this', 'that', 'with', 'have', 'from', 'they', 'been', 'were', 'will', 'what', 'when', 'your', 'said', 'each', 'make', 'like', 'just', 'over', 'such', 'take', 'than', 'them', 'very', 'also', 'into', 'some', 'could', 'would', 'about', 'there', 'their', 'which', 'other', 'think', 'these', 'because', 'really']);
    const words = messageText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    words.forEach(w => {
        if (!commonWords.has(w)) sessionVocabulary.add(w);
    });
}

async function handleSendMessage(messageText) {
    if (!messageText || messageText.trim().length === 0) return;
    messageText = messageText.trim();

    // Track timing
    const responseStartTime = Date.now();
    if (!sessionStartTime) sessionStartTime = Date.now();

    // Hide quick replies
    renderQuickReplies([]);

    // Track fluency
    trackFluency(messageText);

    // Display user message
    appendChatMessage('You', messageText, 'user');

    // Show transcription in feedback
    document.getElementById('feedback-transcription').innerHTML = `<code>"${messageText}"</code>`;

    // Update fluency stats
    const fluencyDiv = document.getElementById('feedback-fluency');
    if (fluencyDiv) {
        const avgTime = sessionTurnCount > 1 ? (Date.now() - sessionStartTime) / (sessionTurnCount * 1000) : 0;
        fluencyDiv.innerHTML = renderFluencyStats(sessionTurnCount, sessionFillerCount, avgTime);
    }

    // Update vocabulary display
    const vocabDiv = document.getElementById('feedback-vocab-used');
    if (vocabDiv && sessionVocabulary.size > 0) {
        const vocabArray = Array.from(sessionVocabulary).slice(-20);
        vocabDiv.innerHTML = `<div class="vocab-pills">${vocabArray.map(w => `<span class="vocab-pill">${w}</span>`).join('')}</div>
            <div class="vocab-count">${sessionVocabulary.size} unique words used</div>`;
    }

    if (!config.apiKey) {
        setTimeout(() => {
            appendChatMessage('AI Partner', 'Your Gemini API Key is missing. Configure it in Settings to start practicing.', 'system');
            speakText("API Key is missing. Configure it in Settings.");
        }, 500);
        return;
    }

    const scenario = getActiveScenario();

    let dynamicPrompt = scenario.systemPrompt;
    if (scenario.id === 'toefl-tutor-coaching') {
        const statsSummary = compilePerformanceSummary();
        dynamicPrompt += `\n\n[STUDENT PERFORMANCE CONTEXT]\n${statsSummary}`;
    }

    // Build system prompt with JSON output instruction
    const systemPrompt = `${dynamicPrompt}

You MUST output your response in JSON format matching this schema:
{
  "response": "Your conversational response (2-3 sentences max).",
  "grammar": "Brief evaluation of grammar errors in the user's last message. Say 'No issues detected.' if correct.",
  "collocations": "1-2 improved academic phrases or collocations the user could use. Can be a string or array.",
  "pronunciation": "Any pronunciation tips based on commonly confused words in their message. Say 'Sounds good!' if nothing stands out.",
  "fluencyNote": "A brief note on their fluency, natural phrasing, or areas to improve."
}`;

    // Add user message to multi-turn contents
    chatContents.push({
        role: 'user',
        parts: [{ text: messageText }]
    });
    saveChatHistory();

    // Show loading
    setConversationState('PROCESSING');
    appendChatMessage('AI Partner', '...', 'system loading-msg');

    try {
        const result = await callGeminiChat(systemPrompt, chatContents);

        // Remove loading message
        const loadingMsg = document.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();

        const aiResponse = result.response || result.text || 'I understand. Could you tell me more?';

        // Add AI response to multi-turn contents
        chatContents.push({
            role: 'model',
            parts: [{ text: JSON.stringify(result) }]
        });

        // Display AI message
        appendChatMessage(`${scenario.emoji} AI Partner`, aiResponse, 'system');

        // Update feedback sidebar
        if (result.grammar) {
            document.getElementById('feedback-grammar').innerHTML = result.grammar;
        }

        const collocationsBox = document.getElementById('feedback-collocations');
        if (collocationsBox && result.collocations) {
            if (Array.isArray(result.collocations)) {
                collocationsBox.innerHTML = `<ul class="feedback-list">${result.collocations.map(c => `<li>${c}</li>`).join('')}</ul>`;
            } else {
                collocationsBox.innerHTML = result.collocations;
            }
        }

        const pronBox = document.getElementById('feedback-pronunciation');
        if (pronBox && result.pronunciation) {
            pronBox.innerHTML = result.pronunciation;
        }

        // Record speaking stats
        recordHistoricalSpeakingScore('speaking');

        // Record speaking session to speakingHistory and History Log table
        const lastStat = statsHistory[statsHistory.length - 1];
        const currentSpeakingScore = lastStat ? lastStat.speaking : 6.0;
        recordSpeakingSession(scenario.name, sessionTurnCount, currentSpeakingScore);

        // Save conversation history and HTML log
        saveChatHistory();

        // Speak the AI response (TTS will handle state transition back to IDLE/LISTENING)
        speakText(aiResponse);

    } catch (error) {
        console.error('Chat error:', error);
        const loadingMsg = document.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();

        setConversationState('IDLE');

        if (error.message === 'API_KEY_MISSING') {
            appendChatMessage('System', '🔑 API Key is missing. Go to Settings to configure your Gemini API key.', 'system');
        } else {
            appendChatMessage('System', `⚠️ Error: ${error.message}. Check your settings and internet connection.`, 'system');
        }
    }
}

function recordHistoricalSpeakingScore(mode) {
    // Proactively push stats to show gradual evolution
    const today = new Date().toISOString().split('T')[0];
    let latest = statsHistory.length > 0 ? { ...statsHistory[statsHistory.length - 1] } : { speaking: 6.0, writing: 6.0, reading: 6.5, listening: 6.0 };
    
    latest.date = today;
    latest.speaking = Math.min(9.0, latest.speaking + 0.1); // Small incremental growth
    
    // Check if entry for today exists, replace or push
    const index = statsHistory.findIndex(pt => pt.date === today);
    if (index !== -1) {
        statsHistory[index] = latest;
    } else {
        statsHistory.push(latest);
    }
    localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));
}

function saveChatHistory() {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return;
    localStorage.setItem(`cerebrum_chat_contents_${activeScenarioId}`, JSON.stringify(chatContents));
    localStorage.setItem(`cerebrum_chat_html_${activeScenarioId}`, chatLog.innerHTML);
    localStorage.setItem(`cerebrum_active_scenario`, activeScenarioId);
}

function recordSpeakingSession(scenarioName, turns, score) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there is already an entry for this scenario today
    const index = speakingHistory.findIndex(s => s.date === today && s.scenarioName === scenarioName);
    
    if (index !== -1) {
        speakingHistory[index].turns = turns;
        speakingHistory[index].score = score;
    } else {
        speakingHistory.push({
            date: today,
            scenarioName: scenarioName,
            turns: turns,
            score: score
        });
    }
    
    localStorage.setItem('cerebrum_speaking_history', JSON.stringify(speakingHistory));
}

function appendChatMessage(sender, text, typeClass) {
    const chatLog = document.getElementById('chat-log');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${typeClass}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender;

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// ==========================================================================
// WRITING ARENA MODULE (IELTS & TOEFL MODE)
// ==========================================================================

function initWritingSystem() {
    const textInput = document.getElementById('writing-text-input');
    const taskSelector = document.getElementById('writing-task-selector');
    const modeSelector = document.getElementById('writing-mode-selector');
    const promptSelector = document.getElementById('writing-prompt-selector');
    const promptText = document.getElementById('writing-prompt-text');

    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        document.getElementById('word-count').textContent = words;
    });

    modeSelector.addEventListener('change', () => {
        const mode = modeSelector.value;
        const task1Title = document.getElementById('metric-t1-title');
        const task2Title = document.getElementById('metric-t2-title');
        const task3Title = document.getElementById('metric-t3-title');
        const task4Title = document.getElementById('metric-t4-title');

        if (mode === 'toefl') {
            task1Title.textContent = 'Development & Structure';
            task2Title.textContent = 'Coherence & Unity';
            task3Title.textContent = 'Vocabulary Depth';
            task4Title.textContent = 'Grammar Variety';
            taskSelector.innerHTML = `
                <option value="task1">TOEFL Integrated Writing (Reading + Lecture)</option>
                <option value="task2" selected>TOEFL Academic Discussion Essay</option>
            `;
        } else {
            task1Title.textContent = 'Task Achievement';
            task2Title.textContent = 'Coherence & Cohesion';
            task3Title.textContent = 'Lexical Resource';
            task4Title.textContent = 'Grammatical Range';
            taskSelector.innerHTML = `
                <option value="task1">Academic Task 1 (Describe Chart)</option>
                <option value="task2" selected>Academic Task 2 (Opinion Essay)</option>
            `;
        }
        updatePromptList();
        updateWritingForumLayout();
    });

    taskSelector.addEventListener('change', () => {
        updatePromptList();
        updateWritingForumLayout();
    });

    promptSelector.addEventListener('change', () => {
        const selected = promptSelector.value;
        if (selected === 'custom') {
            promptText.value = '';
            promptText.placeholder = 'Digite ou edite o enunciado da sua redação aqui...';
            renderPromptVisual('custom');
        } else {
            const mode = modeSelector.value;
            const task = taskSelector.value;
            const promptData = WRITING_PROMPTS[mode][task].find(p => p.id === selected);
            if (promptData) {
                promptText.value = promptData.description;
                renderPromptVisual(selected);
            }
        }
        updateWritingForumLayout();
    });

    document.getElementById('evaluate-essay-btn').addEventListener('click', handleEvaluateEssay);

    // Initial populate of prompts
    updatePromptList();
    updateWritingForumLayout();
}

async function handleEvaluateEssay() {
    const mode = document.getElementById('writing-mode-selector').value;
    const task = document.getElementById('writing-task-selector').value;
    const prompt = document.getElementById('writing-prompt-text').value.trim();
    const essayText = document.getElementById('writing-text-input').value.trim();

    if (!essayText) {
        alert('Please write your essay first.');
        return;
    }

    if (!config.apiKey) {
        alert('API Key is missing. Configure it in Settings to evaluate essays.');
        return;
    }

    document.getElementById('writing-feedback-placeholder').style.display = 'none';
    document.getElementById('writing-feedback-report').style.display = 'none';
    
    const placeholder = document.getElementById('writing-feedback-placeholder');
    placeholder.style.display = 'flex';
    placeholder.innerHTML = `
        <span class="large-icon animate-pulse">⏳</span>
        <h3>Evaluating Essay...</h3>
        <p>Gemini is grading your writing using official ${mode.toUpperCase()} criteria. This may take 10-15 seconds.</p>
    `;

    const systemInstruction = `
    You are an official academic examiner.
    The test format is: "${mode.toUpperCase()} Writing".
    Evaluate the submitted essay for the task type "${task}" and prompt: "${prompt}".
    
    If IELTS: Grade from 1.0 to 9.0 on TA, CC, LR, GR.
    If TOEFL: Grade from 1.0 to 5.0 (TOEFL Rubrics) on Development, Coherence, Vocabulary, Grammar. Convert overall band to 0-30 scale.
    
    You MUST output your evaluation in JSON format matching this schema exactly:
    {
      "band": "Overall estimated band score (e.g., '7.5' for IELTS or '24/30' for TOEFL)",
      "ta": "Task Achievement score or Development score (e.g. 7.0 or 4.0)",
      "cc": "Coherence score (e.g. 8.0 or 4.5)",
      "lr": "Lexical / Vocabulary score (e.g. 7.5 or 4.0)",
      "gr": "Grammatical score (e.g. 7.5 or 4.0)",
      "errors": "Detailed list of errors found and their corrections. Use bullet points.",
      "model": "An exemplary version of the essay for this prompt."
    }
    `;

    try {
        const report = await callGemini(systemInstruction, essayText);

        placeholder.style.display = 'none';
        const reportPane = document.getElementById('writing-feedback-report');
        reportPane.style.display = 'flex';

        document.getElementById('report-band').textContent = report.band;
        document.getElementById('score-ta').textContent = report.ta;
        document.getElementById('score-cc').textContent = report.cc;
        document.getElementById('score-lr').textContent = report.lr;
        document.getElementById('score-gr').textContent = report.gr;

        document.getElementById('report-errors').innerHTML = formatReportSection(report.errors);
        document.getElementById('report-model').innerHTML = formatReportSection(report.model);

        // Update statistics
        writingCount++;
        localStorage.setItem('cerebrum_writing_count', writingCount);

        const today = new Date().toISOString().split('T')[0];

        // Save to writing history
        writingHistory.push({
            date: today,
            mode: mode,
            task: task,
            prompt: prompt || 'Custom Prompt',
            band: report.band
        });
        localStorage.setItem('cerebrum_writing_history', JSON.stringify(writingHistory));

        if (mode === 'toefl') {
            if (task === 'task1') {
                markStudyPlanTaskDone('w1');
            } else if (task === 'task2') {
                markStudyPlanTaskDone('w2');
            }
        }

        let latest = statsHistory.length > 0 ? { ...statsHistory[statsHistory.length - 1] } : { speaking: 6.0, writing: 6.0, reading: 6.5, listening: 6.0 };
        latest.date = today;
        
        // Convert TOEFL score to IELTS equivalency for the line graph consistency (e.g. 24/30 is approx IELTS 7.0)
        let convertedScore = parseFloat(report.band);
        if (mode === 'toefl' && report.band.includes('/30')) {
            const num = parseFloat(report.band.split('/')[0]);
            convertedScore = (num / 30) * 9.0;
        }

        latest.writing = Math.round(convertedScore * 2) / 2;
        
        const index = statsHistory.findIndex(pt => pt.date === today);
        if (index !== -1) statsHistory[index] = latest;
        else statsHistory.push(latest);
        localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));

        // Refresh History Table if visible
        renderHistoryTable();

    } catch (error) {
        console.error('Writing evaluation error:', error);
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <span class="large-icon">⚠️</span>
            <h3>Evaluation Failed</h3>
            <p>Error details: ${error.message}. Please check your connection and configuration.</p>
        `;
    }
}

function formatReportSection(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>')
        .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/g, '');
}

// ==========================================================================
// MOCK TESTS (SIMULADOS) ENGINE
// ==========================================================================

function loadMockTest(testType) {
    activeMockType = testType;
    const testData = MOCK_TESTS[testType];
    if (!testData) return;

    // Reset audio states
    window.speechSynthesis.cancel();
    mockAudioPlaying = false;
    document.getElementById('play-mock-audio-btn').textContent = '🔊 Play Lecture / Audio';

    // Populate header & passage
    document.getElementById('mock-content-title').textContent = testData.title;
    document.getElementById('mock-passage-body').innerHTML = testData.passage;

    const audioPlayer = document.getElementById('audio-mock-player');
    if (testData.type === 'listening') {
        audioPlayer.style.display = 'flex';
    } else {
        audioPlayer.style.display = 'none';
    }

    // Reset Timer
    clearInterval(mockTimerInterval);
    mockTimeRemaining = 1200; // 20 minutes
    updateMockTimerDisplay();
    mockTimerInterval = setInterval(() => {
        mockTimeRemaining--;
        updateMockTimerDisplay();
        if (mockTimeRemaining <= 0) {
            clearInterval(mockTimerInterval);
            handleMockSubmit(true);
        }
    }, 1000);

    // Build question forms
    const form = document.getElementById('mock-questions-form');
    form.innerHTML = '';

    testData.questions.forEach((q, idx) => {
        const qBlock = document.createElement('div');
        qBlock.className = 'question-block';

        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.textContent = `${idx + 1}. ${q.text}`;
        qBlock.appendChild(qText);

        if (q.type === 'mc') {
            q.options.forEach(opt => {
                const label = document.createElement('label');
                label.className = 'option-label';
                label.innerHTML = `
                    <input type="radio" name="q-${q.id}" value="${opt}">
                    <span>${opt}</span>
                `;
                qBlock.appendChild(label);
            });
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input-text-answer';
            input.name = `q-${q.id}`;
            input.placeholder = 'Type your answer here...';
            qBlock.appendChild(input);
        }

        form.appendChild(qBlock);
    });
}

function updateMockTimerDisplay() {
    const min = Math.floor(mockTimeRemaining / 60);
    const sec = mockTimeRemaining % 60;
    document.getElementById('mock-timer').textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function handleMockSubmit(isTimeOut = false) {
    clearInterval(mockTimerInterval);
    const testData = MOCK_TESTS[activeMockType];
    if (!testData) return;

    let score = 0;
    const form = document.getElementById('mock-questions-form');
    const formData = new FormData(form);

    testData.questions.forEach(q => {
        const answerRaw = formData.get(`q-${q.id}`);
        const answer = answerRaw ? answerRaw.trim().toLowerCase() : '';
        const correct = q.correct.toLowerCase();

        if (q.type === 'mc') {
            if (answer === correct) score++;
        } else {
            // Gap filling: flexible matching
            if (correct.includes(answer) && answer.length > 0) score++;
        }
    });

    // Map Raw Score to IELTS/TOEFL Band
    let scoreBand = 0;
    if (activeMockType.startsWith('toefl')) {
        // TOEFL out of 30
        scoreBand = Math.round((score / 10) * 30);
    } else {
        // IELTS out of 9
        if (score === 10) scoreBand = 9.0;
        else if (score >= 8) scoreBand = 8.0;
        else if (score >= 6) scoreBand = 7.0;
        else if (score >= 4) scoreBand = 6.0;
        else scoreBand = 5.0;
    }

    // Save to mock history
    const today = new Date().toISOString().split('T')[0];
    mockHistory.push({
        date: today,
        type: activeMockType,
        scoreRaw: score,
        scoreBand: scoreBand
    });
    localStorage.setItem('cerebrum_mock_history', JSON.stringify(mockHistory));

    // Update Overall Stats
    let latest = statsHistory.length > 0 ? { ...statsHistory[statsHistory.length - 1] } : { speaking: 6.0, writing: 6.0, reading: 6.5, listening: 6.0 };
    latest.date = today;

    // Convert score for line graph
    const convertedScore = activeMockType.startsWith('toefl') ? (scoreBand / 30) * 9.0 : scoreBand;
    if (activeMockType.includes('reading')) {
        latest.reading = Math.round(convertedScore * 2) / 2;
    } else {
        latest.listening = Math.round(convertedScore * 2) / 2;
    }

    const index = statsHistory.findIndex(pt => pt.date === today);
    if (index !== -1) statsHistory[index] = latest;
    else statsHistory.push(latest);
    localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));

    const resultMessage = isTimeOut 
        ? `Time has run out! Mock submitted. Your score: ${score}/10 (Band: ${scoreBand})` 
        : `Simulado submitted successfully! Your score: ${score}/10 (Estimated Score: ${scoreBand})`;
    
    alert(resultMessage);

    // Switch to Evolution tab to see charts updated
    document.querySelector('[data-tab="evolution"]').click();
}

function initMockSystem() {
    // Redesigned TOEFL section bindings
    const btnLoadReadingPractice = document.getElementById('btn-load-reading-practice');
    if (btnLoadReadingPractice) {
        btnLoadReadingPractice.addEventListener('click', () => {
            const selector = document.getElementById('reading-mock-selector');
            if (selector) loadPracticeTest(selector.value, 'reading');
        });
    }

    const btnStartReadingSim = document.getElementById('btn-start-reading-sim');
    if (btnStartReadingSim) {
        btnStartReadingSim.addEventListener('click', () => {
            const selector = document.getElementById('reading-mock-selector');
            if (selector) startTOEFLSimulator(selector.value);
        });
    }

    const btnLoadListeningPractice = document.getElementById('btn-load-listening-practice');
    if (btnLoadListeningPractice) {
        btnLoadListeningPractice.addEventListener('click', () => {
            const selector = document.getElementById('listening-mock-selector');
            if (selector) loadPracticeTest(selector.value, 'listening');
        });
    }

    const btnStartListeningSim = document.getElementById('btn-start-listening-sim');
    if (btnStartListeningSim) {
        btnStartListeningSim.addEventListener('click', () => {
            const selector = document.getElementById('listening-mock-selector');
            if (selector) startTOEFLSimulator(selector.value);
        });
    }

    const btnStartSpeakingSim = document.getElementById('btn-start-speaking-sim');
    if (btnStartSpeakingSim) {
        btnStartSpeakingSim.addEventListener('click', () => {
            const selector = document.getElementById('speaking-mock-selector');
            if (selector) startTOEFLSimulator(selector.value);
        });
    }

    // Practice Arena Inner Action Controls
    const btnExitReadingPractice = document.getElementById('btn-exit-reading-practice');
    if (btnExitReadingPractice) {
        btnExitReadingPractice.addEventListener('click', () => exitPracticeTest('reading'));
    }

    const btnSubmitReadingPractice = document.getElementById('btn-submit-reading-practice');
    if (btnSubmitReadingPractice) {
        btnSubmitReadingPractice.addEventListener('click', () => submitPracticeTest());
    }

    const btnExitListeningPractice = document.getElementById('btn-exit-listening-practice');
    if (btnExitListeningPractice) {
        btnExitListeningPractice.addEventListener('click', () => exitPracticeTest('listening'));
    }

    const btnSubmitListeningPractice = document.getElementById('btn-submit-listening-practice');
    if (btnSubmitListeningPractice) {
        btnSubmitListeningPractice.addEventListener('click', () => submitPracticeTest());
    }

    const btnPlayListeningPractice = document.getElementById('btn-play-listening-practice');
    if (btnPlayListeningPractice) {
        btnPlayListeningPractice.addEventListener('click', () => playPracticeListeningAudio());
    }

    // Safe fallback for legacy elements (if any remain)
    const selector = document.getElementById('mock-test-selector');
    if (selector) {
        selector.addEventListener('change', () => {
            loadMockTest(selector.value);
        });
    }

    const playMockBtn = document.getElementById('play-mock-audio-btn');
    if (playMockBtn) {
        playMockBtn.addEventListener('click', () => {
            const testData = MOCK_TESTS[activeMockType];
            if (!testData || !testData.audioText) return;

            if (mockAudioPlaying) {
                window.speechSynthesis.cancel();
                playMockBtn.textContent = '🔊 Play Lecture / Audio';
                mockAudioPlaying = false;
            } else {
                playMockBtn.textContent = '⏹️ Stop Audio';
                mockAudioPlaying = true;
                speakText(testData.audioText, () => {
                    playMockBtn.textContent = '🔊 Play Lecture / Audio';
                    mockAudioPlaying = false;
                });
            }
        });
    }

    const submitMockBtn = document.getElementById('submit-mock-btn');
    if (submitMockBtn) {
        submitMockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to submit your answers?')) {
                handleMockSubmit(false);
            }
        });
    }
}

// ==========================================================================
// VOCABULARY (SPACED REPETITION) MODULE
// ==========================================================================

function initVocabularySystem() {
    const card = document.getElementById('flashcard');
    const controls = document.getElementById('card-controls');
    
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
        if (card.classList.contains('flipped')) {
            controls.style.visibility = 'visible';
            if (currentCardIndex !== -1) {
                const activeCard = deck[currentCardIndex];
                if (activeCard && activeCard.example) {
                    speakText(activeCard.example, null, true);
                }
            }
        } else {
            controls.style.visibility = 'hidden';
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    });

    const speakBtn = document.getElementById('card-speak-btn');
    if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent card from flipping back
            if (currentCardIndex !== -1) {
                const activeCard = deck[currentCardIndex];
                if (activeCard && activeCard.example) {
                    speakText(activeCard.example, null, true);
                }
            }
        });
    }

    const gradeButtons = document.querySelectorAll('.btn-grade');
    gradeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const grade = btn.getAttribute('data-grade');
            handleGradeCard(grade);
        });
    });

    document.getElementById('reset-deck-btn').addEventListener('click', () => {
        if (confirm('Restore all vocabulary cards to initial status?')) {
            const initialDeck = window.FLASHCARDS_DB || EXPANDED_DECK_INITIAL;
            deck = initialDeck.map(c => ({ ...c, interval: 1, nextDue: Date.now() }));
            saveDeck();
            showNextCard();
        }
    });

    const addBtn = document.getElementById('add-custom-card-btn');
    const form = document.getElementById('add-card-form');
    const cancelFormBtn = document.getElementById('cancel-card-btn');
    const saveFormBtn = document.getElementById('save-card-btn');

    addBtn.addEventListener('click', () => {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });

    cancelFormBtn.addEventListener('click', () => {
        form.style.display = 'none';
    });

    saveFormBtn.addEventListener('click', handleSaveCustomCard);
}

function showNextCard() {
    const card = document.getElementById('flashcard');
    const controls = document.getElementById('card-controls');
    
    if (flashcardTimeoutId) {
        clearTimeout(flashcardTimeoutId);
        flashcardTimeoutId = null;
    }

    const isFlipped = card.classList.contains('flipped');
    card.classList.remove('flipped');
    controls.style.visibility = 'hidden';

    const now = Date.now();
    const dueCards = deck.filter(c => c.nextDue <= now);
    
    document.getElementById('due-count').textContent = dueCards.length;
    document.getElementById('total-count').textContent = deck.length;

    if (dueCards.length === 0) {
        currentCardIndex = -1;
        const updateEmpty = () => {
            document.getElementById('card-front-category').textContent = 'Completed!';
            document.getElementById('card-front-prompt').innerHTML = '🏆 All caught up! Check back later or add custom cards to study more.';
            document.getElementById('card-back-category').textContent = '';
            document.getElementById('card-back-answer').textContent = '';
            document.getElementById('card-back-explanation').textContent = '';
            document.getElementById('card-back-example').textContent = '';
        };
        if (isFlipped) {
            flashcardTimeoutId = setTimeout(updateEmpty, 300);
        } else {
            updateEmpty();
        }
        return;
    }

    const activeCard = dueCards[0];
    currentCardIndex = deck.findIndex(c => c.id === activeCard.id);

    // Update the front of the card immediately (since it is rotated away and invisible)
    document.getElementById('card-front-category').textContent = activeCard.category;
    document.getElementById('card-front-prompt').textContent = activeCard.prompt;
    
    const updateBack = () => {
        document.getElementById('card-back-category').textContent = `${activeCard.category} (Answer)`;
        document.getElementById('card-back-answer').textContent = activeCard.answer;
        document.getElementById('card-back-explanation').textContent = activeCard.explanation;
        document.getElementById('card-back-example').textContent = activeCard.example ? `"${activeCard.example}"` : '';
    };

    if (isFlipped) {
        // Wait 300ms (half of the 600ms flip duration) to update the back,
        // which occurs exactly when the card face is perpendicular and hidden.
        flashcardTimeoutId = setTimeout(updateBack, 300);
    } else {
        updateBack();
    }
}

function handleGradeCard(grade) {
    if (currentCardIndex === -1) return;

    const card = deck[currentCardIndex];
    let intervalMultiplier = 1;

    if (grade === 'easy') {
        intervalMultiplier = 4;
        card.interval = card.interval ? card.interval * intervalMultiplier : 4;
    } else if (grade === 'good') {
        intervalMultiplier = 2;
        card.interval = card.interval ? card.interval * intervalMultiplier : 2;
    } else {
        card.interval = 1;
    }

    if (card.interval > 30) card.interval = 30;

    const hours = card.interval * 24;
    card.nextDue = Date.now() + hours * 60 * 60 * 1000;

    saveDeck();
    showNextCard();
}

function handleSaveCustomCard() {
    const category = document.getElementById('new-card-category').value.trim();
    const prompt = document.getElementById('new-card-prompt').value.trim();
    const answer = document.getElementById('new-card-answer').value.trim();
    const explanation = document.getElementById('new-card-explanation').value.trim();
    const example = document.getElementById('new-card-example').value.trim();

    if (!category || !prompt || !answer || !explanation) {
        alert('Please fill out all required fields.');
        return;
    }

    const newCard = {
        id: Date.now(),
        category,
        prompt,
        answer,
        explanation,
        example,
        interval: 1,
        nextDue: Date.now()
    };

    deck.push(newCard);
    saveDeck();

    document.getElementById('new-card-category').value = '';
    document.getElementById('new-card-prompt').value = '';
    document.getElementById('new-card-answer').value = '';
    document.getElementById('new-card-explanation').value = '';
    document.getElementById('new-card-example').value = '';
    document.getElementById('add-card-form').style.display = 'none';

    showNextCard();
}

// ==========================================================================
// SETTINGS CONFIGURATION MODULE
// ==========================================================================

function initSettingsSystem() {
    const keyInput = document.getElementById('settings-api-key');
    const modelSelect = document.getElementById('settings-api-model');
    const voiceSelect = document.getElementById('settings-tts-voice');
    const rateInput = document.getElementById('settings-tts-rate');
    const silenceTimeoutInput = document.getElementById('settings-silence-timeout');
    const personaSelect = document.getElementById('settings-tutor-persona');
    const saveBtn = document.getElementById('save-settings-btn');
    const demoBtn = document.getElementById('generate-mock-stats-btn');

    keyInput.value = config.apiKey || '';
    modelSelect.value = config.model || 'gemini-2.5-flash';
    rateInput.value = config.rate || 1.0;
    silenceTimeoutInput.value = config.silenceTimeout || 2500;
    personaSelect.value = config.tutorPersona || 'friendly';

    saveBtn.addEventListener('click', () => {
        config.apiKey = keyInput.value.trim();
        config.model = modelSelect.value;
        config.voiceName = voiceSelect.value;
        config.rate = parseFloat(rateInput.value);
        config.silenceTimeout = parseInt(silenceTimeoutInput.value, 10) || 2500;
        config.tutorPersona = personaSelect.value;

        saveConfiguration();
        updateUIStates();
        alert('Configurations saved successfully!');
    });

    demoBtn.addEventListener('click', generateDemoHistoricalData);

    const resetAllBtn = document.getElementById('reset-all-data-btn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            if (confirm('Are you absolutely sure you want to delete all performance logs, mock tests history, writing assessments, speaking sessions, chat logs, and reset all study cards? This cannot be undone.')) {
                // Clear all keys starting with cerebrum_ from localStorage (except config if they want to keep API key)
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    // Keep API key settings and just clear history/decks
                    if (key && key.startsWith('cerebrum_') && key !== 'cerebrum_config') {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                alert('All application data and history have been successfully cleared!');
                window.location.reload();
            }
        });
    }
}

function saveConfiguration() {
    localStorage.setItem('cerebrum_config', JSON.stringify(config));
}

function loadConfiguration() {
    const saved = localStorage.getItem('cerebrum_config');
    if (saved) {
        try {
            config = JSON.parse(saved);
            // Migrate deprecated/retired models automatically to support active ones in 2026
            if (config.model === 'gemini-1.5-flash' || config.model === 'gemini-2.0-flash') {
                config.model = 'gemini-2.5-flash';
                saveConfiguration();
            } else if (config.model === 'gemini-1.5-pro') {
                config.model = 'gemini-2.5-pro';
                saveConfiguration();
            }

            // Set dynamic pause setting default
            if (config.silenceTimeout === undefined) {
                config.silenceTimeout = 2500;
                saveConfiguration();
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }
}

function updateUIStates() {
    const statusDiv = document.getElementById('chat-api-status');
    if (!statusDiv) return;

    if (config.apiKey && config.apiKey.trim() !== '') {
        statusDiv.innerHTML = '<span class="status-dot green"></span> API Key Active';
    } else {
        statusDiv.innerHTML = '<span class="status-dot red"></span> API Key Missing';
    }
}

function saveDeck() {
    localStorage.setItem('cerebrum_deck_v6', JSON.stringify(deck));
}

// ==========================================================================
// DECK BOOTSTRAP AND DATA CHECK
// ==========================================================================

function bootstrapDeck() {
    const saved = localStorage.getItem('cerebrum_deck_v6');

    const initialDeck = window.FLASHCARDS_DB || EXPANDED_DECK_INITIAL;
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Check if we need to upgrade/merge new standard cards
            const currentIds = new Set(parsed.map(c => c.id));
            const hasNewCards = initialDeck.some(c => !currentIds.has(c.id));
            if (hasNewCards) {
                // Map of existing cards by ID to preserve scheduling
                const existingMap = new Map(parsed.map(c => [c.id, c]));
                
                // Construct the upgraded deck
                const upgradedDeck = [];
                
                // Add standard cards: use existing ones if they exist, otherwise the initial ones
                initialDeck.forEach(stdCard => {
                    if (existingMap.has(stdCard.id)) {
                        upgradedDeck.push(existingMap.get(stdCard.id));
                    } else {
                        upgradedDeck.push(stdCard);
                    }
                });
                
                // Add any user custom cards (not present in the standard initial deck)
                const initialIds = new Set(initialDeck.map(c => c.id));
                parsed.forEach(c => {
                    if (!initialIds.has(c.id)) {
                        upgradedDeck.push(c);
                    }
                });
                
                deck = upgradedDeck;
                saveDeck();
            } else {
                deck = parsed;
            }
        } catch (e) {
            deck = initialDeck.map(c => ({ ...c }));
            saveDeck();
        }
    } else {
        deck = initialDeck.map(c => ({ ...c }));
        saveDeck();
    }
}

// Document load setup
document.addEventListener('DOMContentLoaded', () => {
    // One-time programmatic reset requested by user to clear all mock/simulated history
    if (!localStorage.getItem('cerebrum_one_time_reset_done')) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cerebrum_') && key !== 'cerebrum_config') {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        localStorage.setItem('cerebrum_one_time_reset_done', 'true');
    }

    loadConfiguration();
    bootstrapDeck();
    loadStatsHistory();
    initTabSystem();
    initSpeechSystems();
    initChatSystem();
    initWritingSystem();
    initMockSystem();
    initVocabularySystem();
    initSettingsSystem();
    initStudyPlanSystem();
    initTOEFLSimulatorSystem();
    initMobileMenu();
    updateUIStates();
});

// ==========================================================================
// TOEFL iBT WRITING DISCUSSION FORUM LOADER
// ==========================================================================

function updateWritingForumLayout() {
    const mode = document.getElementById('writing-mode-selector').value;
    const task = document.getElementById('writing-task-selector').value;
    const promptSelector = document.getElementById('writing-prompt-selector');
    const promptId = promptSelector ? promptSelector.value : 'custom';
    const forumDiv = document.getElementById('writing-academic-discussion-forum');
    const promptBox = document.querySelector('.prompt-box');

    if (!forumDiv || !promptBox) return;

    if (mode === 'toefl' && task === 'task2' && promptId !== 'custom') {
        const prompts = (WRITING_PROMPTS[mode] && WRITING_PROMPTS[mode][task]) ? WRITING_PROMPTS[mode][task] : [];
        const promptData = prompts.find(p => p.id === promptId);
        if (promptData) {
            forumDiv.style.display = 'flex';
            promptBox.style.display = 'none';

            forumDiv.innerHTML = `
                <div class="forum-professor-card">
                    <div class="forum-user-badge">
                        <span class="forum-user-avatar">👨‍🏫</span>
                        <span>${promptData.professorName || 'Professor'}</span>
                        <span class="forum-user-role prof">Professor</span>
                    </div>
                    <div class="forum-post-text">
                        <strong>Topic: ${promptData.topic || 'Academic Discussion'}</strong><br><br>
                        ${promptData.professorPrompt || promptData.description}
                    </div>
                </div>
                <div class="forum-student-card kelly">
                    <div class="forum-user-badge">
                        <span class="forum-user-avatar">👩</span>
                        <span>${promptData.student1Name || 'Kelly'}</span>
                        <span class="forum-user-role">Student</span>
                    </div>
                    <div class="forum-post-text">${promptData.student1Post || ''}</div>
                </div>
                <div class="forum-student-card paul">
                    <div class="forum-user-badge">
                        <span class="forum-user-avatar">👨</span>
                        <span>${promptData.student2Name || 'Paul'}</span>
                        <span class="forum-user-role">Student</span>
                    </div>
                    <div class="forum-post-text">${promptData.student2Post || ''}</div>
                </div>
            `;
            return;
        }
    }

    forumDiv.style.display = 'none';
    promptBox.style.display = 'block';
}

// ==========================================================================
// TOEFL iBT STUDY PLAN & TUTOR DASHBOARD SYSTEM
// ==========================================================================

const CYCLE_CHECKLISTS = {
    1: [
        { id: 'r1', label: 'Outline Coral Reefs Passage (Block 1)', desc: 'Skim the Science text on Coral Reefs, locate the paradox and details.', actionText: 'Study Passage', action: 'go-reading' },
        { id: 'r2', label: 'Complete Reading Mock Test 1 (Block 2)', desc: 'Run TOEFL Reading Mock 1 in Simulator Mode. Aim for score > 22.', actionText: 'Start Simulator', action: 'start-reading-sim' }
    ],
    2: [
        { id: 'l1', label: 'Practice Plate Tectonics Dictation (Block 1)', desc: 'Listen to the geology lecture once, write down notes on Wegener fossils.', actionText: 'Listen Audio', action: 'go-listening' },
        { id: 'l2', label: 'Complete Listening Mock Test 1 (Block 2)', desc: 'Run TOEFL Listening Mock 1 in Simulator Mode.', actionText: 'Start Simulator', action: 'start-listening-sim' }
    ],
    3: [
        { id: 's1', label: 'Practice Listen and Repeat (Block 1)', desc: 'Shadow and repeat 7 campus gym orientation sentences in Simulator.', actionText: 'Open Simulator', action: 'start-speaking-repeat' },
        { id: 's2', label: 'Perform Campus Interview (Block 2)', desc: 'Answer the 4 interview questions spontaneously with no preparation.', actionText: 'Start Interview', action: 'start-speaking-interview' }
    ],
    4: [
        { id: 'w1', label: 'Integrated Writing Synthesis (Block 1)', desc: 'Write a synthesis response on Machine Translation or JIT Manufacturing.', actionText: 'Go to Arena', action: 'go-writing-task1' },
        { id: 'w2', label: 'Write Academic Discussion Contribution (Block 2)', desc: 'Write a contribution in the Classroom Forum, replying to Kelly & Paul.', actionText: 'Go to Forum', action: 'go-writing-task2' }
    ]
};

const TUTOR_CYCLES_GUIDANCE = {
    1: `Pedro, welcome to Day 1 of your cycle: **Reading**. Today we focus on academic science and history passages. Your task is to practice the split-screen mock test, highlighting vocabulary words, and completing all 10 questions. Focus on identifying facts and making inferences. Let's do this!`,
    2: `Pedro, today is Day 2: **Listening**. We are practicing note-taking during academic lectures. Watch out for transition words (e.g. *however, on the other hand, consequently*) since the questions will test you on relationships between ideas. Listen to the Geology lecture once and answer the 9 questions.`,
    3: `Pedro, it is Day 3: **Speaking**. We are using the brand new 2026 TOEFL format: **Listen and Repeat** and **Take an Interview**. Listen to the sentences carefully and repeat them matching the rhythm, stress, and pronunciation. In the interview, speak spontaneously without preparing.`,
    4: `Pedro, today is Day 4: **Writing**. We are writing the Integrated Synthesis essay and participating in the online **Academic Discussion Forum**. In the forum, you must state your opinion clearly, support it with a personal example, and directly reference or respond to the arguments made by **Kelly** and **Paul**.`
};

function initStudyPlanSystem() {
    const cycleButtons = document.querySelectorAll('.btn-cycle');
    cycleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cycleDay = parseInt(btn.getAttribute('data-cycle'), 10);
            localStorage.setItem('cerebrum_current_cycle_day', cycleDay);
            updateStudyPlanUI();
        });
    });

    updateStudyPlanUI();
}

function updateStudyPlanUI() {
    const cycleDay = parseInt(localStorage.getItem('cerebrum_current_cycle_day') || '1', 10);
    const badge = document.getElementById('current-cycle-badge');
    if (badge) {
        const cycleLabels = { 1: 'Day 1: Reading', 2: 'Day 2: Listening', 3: 'Day 3: Speaking', 4: 'Day 4: Writing' };
        badge.textContent = `Cycle: ${cycleLabels[cycleDay]}`;
    }

    // Toggle active cycle button style
    document.querySelectorAll('.btn-cycle').forEach(btn => {
        const day = parseInt(btn.getAttribute('data-cycle'), 10);
        if (day === cycleDay) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Load tutor active advice
    const adviceBubble = document.getElementById('tutor-guidance-bubble');
    if (adviceBubble) {
        adviceBubble.innerHTML = getPersonalizedTutorAdvice(cycleDay);
    }

    // Load checklist items
    const container = document.getElementById('cycle-checklist-container');
    if (container) {
        container.innerHTML = '';
        const items = CYCLE_CHECKLISTS[cycleDay] || [];
        const savedState = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checklist-item';
            const isChecked = savedState[item.id] ? 'checked' : '';

            itemDiv.innerHTML = `
                <input type="checkbox" id="chk-${item.id}" data-id="${item.id}" ${isChecked}>
                <div class="checklist-label" style="flex-grow: 1;">
                    <span>${item.label}</span>
                    <span class="checklist-desc">${item.desc}</span>
                </div>
                ${item.actionText ? `<button class="btn btn-secondary btn-action-trigger" data-action="${item.action}" style="margin-left: auto; font-size: 0.8rem; padding: 0.4rem 0.8rem; white-space: nowrap;">${item.actionText}</button>` : ''}
            `;

            const chk = itemDiv.querySelector('input');
            chk.addEventListener('change', () => {
                savedState[item.id] = chk.checked;
                localStorage.setItem(`cerebrum_checklist_state_day_${cycleDay}`, JSON.stringify(savedState));
                recomputeCycleProgress(cycleDay, items);
            });

            const actionBtn = itemDiv.querySelector('.btn-action-trigger');
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    executeStudyPlanAction(item.action);
                });
            }

            container.appendChild(itemDiv);
        });

        recomputeCycleProgress(cycleDay, items);
    }
    updateStudyWizardUI(cycleDay);
}

function recomputeCycleProgress(cycleDay, items) {
    const savedState = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');
    let checkedCount = 0;
    items.forEach(item => {
        if (savedState[item.id]) checkedCount++;
    });

    const percent = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
    const progressBar = document.getElementById('cycle-progress-bar');
    const progressText = document.getElementById('cycle-progress-percent');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}% completed today`;
}

// ==========================================================================
// TOEFL iBT TEST-DAY SIMULATOR OVERLAY LOGIC
// ==========================================================================

let toeflSimState = {
    active: false,
    testType: '',
    currentQuestionIndex: 0,
    answers: {},
    timeRemaining: 0,
    timerInterval: null,
    audioPlaying: false,
    recognitionInstance: null,
    speakingInterval: null,
    userTranscripts: []
};

function initTOEFLSimulatorSystem() {
    document.getElementById('toefl-btn-volume').addEventListener('click', () => {
        alert('Volume levels are optimal. Adjust using your device volume buttons.');
    });

    document.getElementById('toefl-btn-help').addEventListener('click', () => {
        alert('TOEFL iBT Help:\n- In Reading, click Back/Next to navigate. Answers save automatically.\n- In Listening, play audio once. Questions appear after audio completes.\n- In Speaking, follow the prompt instructions and record when the indicator glows red.');
    });

    document.getElementById('toefl-btn-back').addEventListener('click', () => {
        if (toeflSimState.currentQuestionIndex > 0) {
            toeflSimState.currentQuestionIndex--;
            updateTOEFLSimUI();
        }
    });

    document.getElementById('toefl-btn-next').addEventListener('click', () => {
        handleTOEFLSimNext();
    });

    document.getElementById('toefl-sim-exit-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the TOEFL Exam Simulation? Your current progress will not be saved.')) {
            exitTOEFLSimulator();
        }
    });

    document.getElementById('toefl-sim-submit-btn').addEventListener('click', () => {
        if (confirm('Are you ready to submit your answers and complete this TOEFL section?')) {
            submitTOEFLSim();
        }
    });

    document.getElementById('toefl-sim-play-audio-btn').addEventListener('click', () => {
        playTOEFLSimAudio();
    });
}

function startTOEFLSimulator(testType) {
    window.speechSynthesis.cancel();
    clearInterval(toeflSimState.timerInterval);
    clearInterval(toeflSimState.speakingInterval);
    if (toeflSimState.recognitionInstance) {
        try { toeflSimState.recognitionInstance.stop(); } catch(e) {}
    }

    toeflSimState = {
        active: true,
        testType: testType,
        currentQuestionIndex: 0,
        answers: {},
        timeRemaining: 0,
        timerInterval: null,
        audioPlaying: false,
        recognitionInstance: null,
        speakingInterval: null,
        userTranscripts: []
    };

    const testData = MOCK_TESTS[testType];
    if (!testData) return;

    // Hide primary web application layout, show simulator overlay
    const mainApp = document.querySelector('.app-container');
    if (mainApp) mainApp.style.display = 'none';
    document.getElementById('toefl-simulator-overlay').style.display = 'flex';

    // Set Timer duration based on TOEFL requirements
    if (testType.includes('reading')) {
        toeflSimState.timeRemaining = 2100; // 35 minutes for two passages (our mock simulates 1)
        document.getElementById('toefl-sim-section-name').textContent = 'Reading Section';
    } else if (testType.includes('listening')) {
        toeflSimState.timeRemaining = 1200; // 20 minutes
        document.getElementById('toefl-sim-section-name').textContent = 'Listening Section';
    } else if (testType.includes('speaking')) {
        toeflSimState.timeRemaining = 480; // 8 minutes
        document.getElementById('toefl-sim-section-name').textContent = 'Speaking Section';
    }

    updateTOEFLSimTimerDisplay();
    toeflSimState.timerInterval = setInterval(() => {
        if (toeflSimState.timeRemaining > 0) {
            toeflSimState.timeRemaining--;
            updateTOEFLSimTimerDisplay();
        } else {
            clearInterval(toeflSimState.timerInterval);
            alert('Time Limit Exceeded! Submitting test answers automatically...');
            submitTOEFLSim();
        }
    }, 1000);

    // Render corresponding viewports
    document.getElementById('toefl-sim-reading-view').style.display = 'none';
    document.getElementById('toefl-sim-listening-view').style.display = 'none';
    document.getElementById('toefl-sim-speaking-view').style.display = 'none';

    if (testData.type === 'reading') {
        document.getElementById('toefl-sim-reading-view').style.display = 'grid';
    } else if (testData.type === 'listening') {
        document.getElementById('toefl-sim-listening-view').style.display = 'flex';
        document.getElementById('toefl-sim-listening-graphic-container').style.display = 'flex';
        document.getElementById('toefl-sim-listening-q-pane').style.display = 'none';
        document.getElementById('toefl-sim-listening-topic').textContent = testData.title;
        document.getElementById('toefl-sim-audio-progress').style.width = '0%';
        document.getElementById('toefl-sim-play-audio-btn').disabled = false;
        document.getElementById('toefl-sim-play-audio-btn').textContent = '🔊 Play Lecture / Conversation';
    } else if (testData.type.startsWith('speaking')) {
        document.getElementById('toefl-sim-speaking-view').style.display = 'flex';
    }

    updateTOEFLSimUI();
}

function updateTOEFLSimTimerDisplay() {
    const min = Math.floor(toeflSimState.timeRemaining / 60);
    const sec = toeflSimState.timeRemaining % 60;
    const timerVal = document.getElementById('toefl-sim-timer');
    if (timerVal) {
        timerVal.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
}

function updateTOEFLSimUI() {
    const testData = MOCK_TESTS[toeflSimState.testType];
    if (!testData) return;

    document.getElementById('toefl-sim-title').textContent = testData.title;

    // Toggle Back button accessibility
    const backBtn = document.getElementById('toefl-btn-back');
    if (testData.type === 'reading' && toeflSimState.currentQuestionIndex > 0) {
        backBtn.removeAttribute('disabled');
    } else {
        backBtn.setAttribute('disabled', 'true');
    }

    // Toggle Submit section visibility on last questions
    const submitBtn = document.getElementById('toefl-sim-submit-btn');
    if (toeflSimState.currentQuestionIndex === testData.questions.length - 1) {
        // Listening and Speaking submit at the end
        if (testData.type !== 'listening' || document.getElementById('toefl-sim-listening-q-pane').style.display === 'block') {
            submitBtn.style.display = 'block';
        }
    } else {
        submitBtn.style.display = 'none';
    }

    // 1. Reading view population
    if (testData.type === 'reading') {
        document.getElementById('toefl-sim-passage').innerHTML = testData.passage;
        document.getElementById('toefl-sim-q-num').textContent = `Question ${toeflSimState.currentQuestionIndex + 1} of ${testData.questions.length}`;

        const q = testData.questions[toeflSimState.currentQuestionIndex];
        document.getElementById('toefl-sim-q-text').textContent = q.text;

        const optList = document.getElementById('toefl-sim-q-options');
        optList.innerHTML = '';

        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'toefl-option-label';
            const isChecked = toeflSimState.answers[q.id] === opt;
            if (isChecked) label.classList.add('selected');

            label.innerHTML = `
                <input type="radio" name="toefl-q-${q.id}" value="${opt}" ${isChecked ? 'checked' : ''}>
                <span>${opt}</span>
            `;

            const input = label.querySelector('input');
            input.addEventListener('change', () => {
                document.querySelectorAll('.toefl-option-label').forEach(lbl => lbl.classList.remove('selected'));
                label.classList.add('selected');
                toeflSimState.answers[q.id] = opt;
            });

            optList.appendChild(label);
        });
    }

    // 2. Listening questions view population
    if (testData.type === 'listening' && document.getElementById('toefl-sim-listening-q-pane').style.display === 'block') {
        document.getElementById('toefl-sim-l-q-num').textContent = `Question ${toeflSimState.currentQuestionIndex + 1} of ${testData.questions.length}`;

        const q = testData.questions[toeflSimState.currentQuestionIndex];
        document.getElementById('toefl-sim-l-q-text').textContent = q.text;

        const optList = document.getElementById('toefl-sim-l-q-options');
        optList.innerHTML = '';

        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'toefl-option-label';
            const isChecked = toeflSimState.answers[q.id] === opt;
            if (isChecked) label.classList.add('selected');

            label.innerHTML = `
                <input type="radio" name="toefl-l-q-${q.id}" value="${opt}" ${isChecked ? 'checked' : ''}>
                <span>${opt}</span>
            `;

            const input = label.querySelector('input');
            input.addEventListener('change', () => {
                document.querySelectorAll('.toefl-option-label').forEach(lbl => lbl.classList.remove('selected'));
                label.classList.add('selected');
                toeflSimState.answers[q.id] = opt;
            });

            optList.appendChild(label);
        });
    }

    // 3. Speaking views execution
    if (testData.type.startsWith('speaking')) {
        runSpeakingTaskStep();
    }
}

async function playTOEFLSimAudio() {
    const testData = MOCK_TESTS[toeflSimState.testType];
    if (!testData) return;

    const playBtn = document.getElementById('toefl-sim-play-audio-btn');
    playBtn.setAttribute('disabled', 'true');
    playBtn.textContent = 'Playing Lecture Audio...';

    const progressBar = document.getElementById('toefl-sim-audio-progress');
    progressBar.style.width = '0%';

    // Cancel any active TTS speech
    window.speechSynthesis.cancel();

    // Check if mock test uses YouTube audio track
    if (testData.youtubeId) {
        if (toeflYTPlayer) {
            try { toeflYTPlayer.destroy(); } catch (e) {}
            toeflYTPlayer = null;
        }

        toeflYTPlayer = new YT.Player('toefl-audio-placeholder', {
            height: '0',
            width: '0',
            videoId: testData.youtubeId,
            playerVars: {
                autoplay: 1,
                controls: 0,
                showinfo: 0,
                rel: 0,
                modestbranding: 1
            },
            events: {
                onReady: (event) => {
                    event.target.playVideo();
                    
                    clearInterval(toeflYTProgressInterval);
                    toeflYTProgressInterval = setInterval(() => {
                        if (toeflYTPlayer && typeof toeflYTPlayer.getCurrentTime === 'function') {
                            const cur = toeflYTPlayer.getCurrentTime();
                            const dur = toeflYTPlayer.getDuration();
                            if (dur > 0) {
                                const pct = (cur / dur) * 100;
                                progressBar.style.width = `${Math.min(100, pct)}%`;
                            }
                        }
                    }, 250);
                },
                onStateChange: (event) => {
                    // YT.PlayerState.ENDED is 0
                    if (event.data === 0) {
                        clearInterval(toeflYTProgressInterval);
                        progressBar.style.width = '100%';
                        playBtn.textContent = 'Audio Complete';
                        
                        setTimeout(() => {
                            document.getElementById('toefl-sim-listening-graphic-container').style.display = 'none';
                            document.getElementById('toefl-sim-listening-q-pane').style.display = 'block';
                            updateTOEFLSimUI();
                        }, 1000);
                    }
                },
                onError: (err) => {
                    console.error('YouTube Player Error:', err);
                    alert('YouTube playback failed. Falling back to browser text-to-speech...');
                    clearInterval(toeflYTProgressInterval);
                    playTOEFLSimAudioTTS(testData, playBtn, progressBar);
                }
            }
        });
    } else {
        playTOEFLSimAudioTTS(testData, playBtn, progressBar);
    }
}

function playTOEFLSimAudioTTS(testData, playBtn, progressBar) {
    if (!testData.audioText) return;
    let width = 0;
    
    // Approximate audio duration based on text length (avg 140 words per minute)
    const wordCount = testData.audioText.split(/\s+/).length;
    const estimatedDurationMs = (wordCount / 140) * 60 * 1000;
    const intervalTime = 200;
    const step = (intervalTime / estimatedDurationMs) * 100;

    let progressInterval = setInterval(() => {
        width = Math.min(100, width + step);
        progressBar.style.width = `${width}%`;
        if (width >= 100) clearInterval(progressInterval);
    }, intervalTime);

    speakText(testData.audioText, () => {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        playBtn.textContent = 'Audio Complete';

        setTimeout(() => {
            document.getElementById('toefl-sim-listening-graphic-container').style.display = 'none';
            document.getElementById('toefl-sim-listening-q-pane').style.display = 'block';
            updateTOEFLSimUI();
        }, 1000);
    });
}

function runSpeakingTaskStep() {
    clearInterval(toeflSimState.speakingInterval);
    window.speechSynthesis.cancel();
    if (toeflSimState.recognitionInstance) {
        try { toeflSimState.recognitionInstance.stop(); } catch(e) {}
    }

    const testData = MOCK_TESTS[toeflSimState.testType];
    const q = testData.questions[toeflSimState.currentQuestionIndex];
    if (!q) return;

    const taskBadge = document.getElementById('toefl-sim-s-task-type');
    const promptText = document.getElementById('toefl-sim-s-prompt');
    const circle = document.getElementById('toefl-sim-s-circle');
    const timerText = document.getElementById('toefl-sim-s-timer-desc');
    const transcription = document.getElementById('toefl-sim-s-transcription');
    const wave = document.getElementById('toefl-sim-s-wave');

    circle.className = 'toefl-speaking-circle';
    circle.textContent = '⏳';
    timerText.textContent = 'Preparing audio...';
    transcription.textContent = 'Awaiting microphone trigger...';
    wave.style.display = 'none';

    if (testData.type === 'speaking-repeat') {
        taskBadge.textContent = 'Speaking: Listen & Repeat';
        promptText.textContent = 'Listen carefully to the audio and repeat the sentence exactly as heard.';

        // TTS plays the target sentence, then prompts SpeechToText
        setTimeout(() => {
            speakText(q.text, () => {
                // Audio ended. Transition to recording mode immediately
                timerText.textContent = 'RECORDING NOW...';
                circle.classList.add('recording');
                circle.textContent = '🎤';
                wave.style.display = 'flex';
                transcription.textContent = 'Listening to your speech...';

                startSpeakingSpeechToText(6, (result) => {
                    const score = getSimilarityScore(result, q.text);
                    toeflSimState.answers[q.id] = result;
                    toeflSimState.userTranscripts.push({ questionId: q.id, target: q.text, actual: result, similarity: score });
                    
                    transcription.innerHTML = `<strong>You said:</strong> "${result || '(No speech detected)'}"<br><strong>Accuracy Match:</strong> ${Math.round(score)}%`;
                });
            });
        }, 1000);

    } else if (testData.type === 'speaking-interview') {
        taskBadge.textContent = 'Speaking: Campus Interview';
        promptText.textContent = `Question: "${q.text}"`;

        setTimeout(() => {
            speakText(q.text, () => {
                // Start answering immediately (no prep time in TOEFL speaking interview)
                circle.classList.add('recording');
                circle.textContent = '🎤';
                wave.style.display = 'flex';
                transcription.textContent = 'Recording your answer. Speak clearly...';

                let secondsRemaining = 45;
                timerText.textContent = `SPEAKING: ${secondsRemaining}s`;

                toeflSimState.speakingInterval = setInterval(() => {
                    secondsRemaining--;
                    timerText.textContent = `SPEAKING: ${secondsRemaining}s`;
                    if (secondsRemaining <= 0) {
                        clearInterval(toeflSimState.speakingInterval);
                    }
                }, 1000);

                startSpeakingSpeechToText(45, (result) => {
                    clearInterval(toeflSimState.speakingInterval);
                    toeflSimState.answers[q.id] = result;
                    transcription.innerHTML = `<strong>Response recorded:</strong> "${result || '(No speech detected)'}"`;
                });
            });
        }, 1000);
    }
}

function startSpeakingSpeechToText(durationSeconds, onResultCallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported in this browser.');
        setTimeout(() => onResultCallback('Speech recognition not supported'), durationSeconds * 1000);
        return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    toeflSimState.recognitionInstance = rec;

    let transcriptResult = '';
    rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcriptResult += event.results[i][0].transcript + ' ';
            }
        }
    };

    rec.onend = () => {
        onResultCallback(transcriptResult.trim());
    };

    try {
        rec.start();
        setTimeout(() => {
            try { rec.stop(); } catch(e) {}
        }, durationSeconds * 1000);
    } catch(e) {
        console.error('Failed starting speech recognition:', e);
    }
}

function handleTOEFLSimNext() {
    const testData = MOCK_TESTS[toeflSimState.testType];
    if (!testData) return;

    // Check if user answered or repeated
    const q = testData.questions[toeflSimState.currentQuestionIndex];
    if (testData.type === 'reading' || (testData.type === 'listening' && document.getElementById('toefl-sim-listening-q-pane').style.display === 'block')) {
        if (!toeflSimState.answers[q.id]) {
            alert('Please select or input an answer before moving forward.');
            return;
        }
    }

    if (toeflSimState.currentQuestionIndex < testData.questions.length - 1) {
        toeflSimState.currentQuestionIndex++;
        updateTOEFLSimUI();
    } else {
        alert('This is the end of the section. Click the Submit button on the top right to complete the test.');
    }
}

async function submitTOEFLSim() {
    clearInterval(toeflSimState.timerInterval);
    clearInterval(toeflSimState.speakingInterval);
    clearInterval(toeflYTProgressInterval);
    window.speechSynthesis.cancel();
    if (toeflSimState.recognitionInstance) {
        try { toeflSimState.recognitionInstance.stop(); } catch(e) {}
    }
    if (toeflYTPlayer) {
        try { toeflYTPlayer.stopVideo(); } catch(e) {}
        try { toeflYTPlayer.destroy(); } catch(e) {}
        toeflYTPlayer = null;
    }

    const testData = MOCK_TESTS[toeflSimState.testType];
    if (!testData) return;

    let rawScore = 0;
    let finalScore = 0;

    if (testData.type === 'reading' || testData.type === 'listening') {
        testData.questions.forEach(q => {
            const answer = toeflSimState.answers[q.id] || '';
            if (answer.trim().toLowerCase() === q.correct.trim().toLowerCase()) {
                rawScore++;
            }
        });
        // TOEFL sections are graded out of 30 scale
        finalScore = Math.round((rawScore / testData.questions.length) * 30);
    } else if (testData.type === 'speaking-repeat') {
        // Average similarity score of the 7 sentences
        let totalSim = 0;
        toeflSimState.userTranscripts.forEach(item => {
            if (item.similarity >= 75) rawScore++; // Count correct repetitions
            totalSim += item.similarity;
        });
        const averageSim = toeflSimState.userTranscripts.length > 0 ? (totalSim / toeflSimState.userTranscripts.length) : 0;
        finalScore = Math.round((rawScore / testData.questions.length) * 30);
        
        alert(`Speaking repeat section complete!\nTotal items correctly repeated: ${rawScore}/7\nAverage Pronunciation Precision: ${Math.round(averageSim)}%\nTOEFL Scaled Score: ${finalScore}/30`);
    } else if (testData.type === 'speaking-interview') {
        document.getElementById('toefl-sim-s-timer-desc').textContent = 'Grading...';
        document.getElementById('toefl-sim-s-transcription').textContent = 'Sending transcripts to Gemini to evaluate with the official ETS TOEFL Speaking rubrics...';

        if (!config.apiKey) {
            alert('Speaking Mock complete! (Configure Gemini API Key in Settings to get real-time feedback and detailed ratings).');
            finalScore = 22; // Average default score when key is missing
        } else {
            const systemPrompt = `
                You are an official ETS TOEFL Speaking examiner rating a candidate's speech.
                The candidate participated in a 4-question campus interview. Here are the questions and actual speech transcripts:
                
                ${testData.questions.map((q, idx) => `Q${idx+1}: "${q.text}"\nAnswer Transcript: "${toeflSimState.answers[q.id] || '(No speech recorded)'}"`).join('\n\n')}
                
                Grade the candidate on a scale of 0-30 based on TOEFL Speaking rubrics (Intelligibility/Fluency, Vocabulary/Grammar use, and Topic Development/Coherence).
                You MUST return JSON in this schema exactly:
                {
                   "score": 24, // integer from 0 to 30
                   "feedback": "Your vocabulary is outstanding, but there are small grammatical errors in Q2. Focus on..."
                }
            `;
            try {
                const report = await callGemini(systemPrompt, 'Rate this interview');
                finalScore = report.score;
                alert(`Tutor Grading Feedback:\nPredicted Score: ${finalScore}/30\n\n${report.feedback}`);
            } catch(e) {
                console.error('Gemini speaking evaluation error:', e);
                finalScore = 22;
            }
        }
    }

    // Check off study plan task based on testType
    if (toeflSimState.testType.includes('reading')) {
        markStudyPlanTaskDone('r2');
    } else if (toeflSimState.testType.includes('listening')) {
        markStudyPlanTaskDone('l2');
    } else if (toeflSimState.testType === 'toefl-speaking-repeat') {
        markStudyPlanTaskDone('s1');
    } else if (toeflSimState.testType === 'toefl-speaking-interview') {
        markStudyPlanTaskDone('s2');
    }

    // Save test performance to history
    const today = new Date().toISOString().split('T')[0];
    mockHistory.push({
        date: today,
        type: toeflSimState.testType,
        scoreRaw: rawScore,
        scoreBand: finalScore
    });
    localStorage.setItem('cerebrum_mock_history', JSON.stringify(mockHistory));

    // Update Overall Stats
    let latest = statsHistory.length > 0 ? { ...statsHistory[statsHistory.length - 1] } : { speaking: 6.0, writing: 6.0, reading: 6.5, listening: 6.0 };
    latest.date = today;

    // Map TOEFL 30 score back to IELTS 9 scale for the line charts consistency
    const convertedScore = (finalScore / 30) * 9.0;
    if (toeflSimState.testType.includes('reading')) {
        latest.reading = Math.round(convertedScore * 2) / 2;
    } else if (toeflSimState.testType.includes('listening')) {
        latest.listening = Math.round(convertedScore * 2) / 2;
    } else if (toeflSimState.testType.includes('speaking')) {
        latest.speaking = Math.round(convertedScore * 2) / 2;
    }

    const index = statsHistory.findIndex(pt => pt.date === today);
    if (index !== -1) statsHistory[index] = latest;
    else statsHistory.push(latest);
    localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));

    exitTOEFLSimulator();
    
    // Switch to Evolution Tab to see updated charts
    const evTab = document.querySelector('[data-tab="evolution"]');
    if (evTab) evTab.click();
}

function exitTOEFLSimulator() {
    clearInterval(toeflSimState.timerInterval);
    clearInterval(toeflSimState.speakingInterval);
    clearInterval(toeflYTProgressInterval);
    window.speechSynthesis.cancel();
    if (toeflSimState.recognitionInstance) {
        try { toeflSimState.recognitionInstance.stop(); } catch(e) {}
    }
    if (toeflYTPlayer) {
        try { toeflYTPlayer.stopVideo(); } catch(e) {}
        try { toeflYTPlayer.destroy(); } catch(e) {}
        toeflYTPlayer = null;
    }

    toeflSimState.active = false;
    document.getElementById('toefl-simulator-overlay').style.display = 'none';

    const mainApp = document.querySelector('.app-container');
    if (mainApp) mainApp.style.display = 'grid';
}

// ==========================================================================
// STRING DISTANCE ALGORITHM (LEVENSHTEIN SIMILARITY)
// ==========================================================================

function getSimilarityScore(str1, str2) {
    const s1 = str1.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const s2 = str2.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    
    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;

    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j - 1][i] + 1, // deletion
                track[j][i - 1] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    
    let distance = track[s2.length][s1.length];
    let longestLength = Math.max(s1.length, s2.length);
    return ((longestLength - distance) / longestLength) * 100;
}

// ==========================================================================
// TOEFL COACHING, DIAGNOSTICS & DYNAMIC STUDY PLAN ASSISTANCE
// ==========================================================================

function compilePerformanceSummary() {
    const cycleDay = localStorage.getItem('cerebrum_current_cycle_day') || '1';
    
    let readingMocks = [];
    let listeningMocks = [];
    let speakingMocks = [];
    mockHistory.forEach(m => {
        if (m.type.includes('reading')) readingMocks.push(m.scoreBand);
        else if (m.type.includes('listening')) listeningMocks.push(m.scoreBand);
        else if (m.type.includes('speaking')) speakingMocks.push(m.scoreBand);
    });
    
    const avgReading = readingMocks.length > 0 ? (readingMocks.reduce((a,b)=>a+b, 0) / readingMocks.length).toFixed(1) : 'None taken';
    const avgListening = listeningMocks.length > 0 ? (listeningMocks.reduce((a,b)=>a+b, 0) / listeningMocks.length).toFixed(1) : 'None taken';
    const avgSpeaking = speakingMocks.length > 0 ? (speakingMocks.reduce((a,b)=>a+b, 0) / speakingMocks.length).toFixed(1) : 'None taken';
    
    const latestEssay = writingHistory.length > 0 ? writingHistory[writingHistory.length - 1].band : 'None graded';
    const studiedCount = deck.filter(c => c.interval > 1).length;
    const masteredCount = deck.filter(c => c.interval > 8).length;
    
    return `
- Active Study Cycle: Day ${cycleDay}
- Reading Mock Tests Average: ${avgReading}/30
- Listening Mock Tests Average: ${avgListening}/30
- Speaking Mock Tests Average: ${avgSpeaking}/30
- Latest Essay Rating: ${latestEssay}
- Spaced Repetition Progress: ${studiedCount} cards studied, ${masteredCount} mastered out of ${deck.length} total.
`;
}

function getPersonalizedTutorAdvice(cycleDay) {
    const baseGuidance = TUTOR_CYCLES_GUIDANCE[cycleDay] || "Awaiting study cycle settings...";
    let customRemedial = "";
    
    let readingMocks = [];
    let listeningMocks = [];
    let speakingMocks = [];
    mockHistory.forEach(m => {
        if (m.type.includes('reading')) readingMocks.push(m.scoreBand);
        else if (m.type.includes('listening')) listeningMocks.push(m.scoreBand);
        else if (m.type.includes('speaking')) speakingMocks.push(m.scoreBand);
    });
    
    const avgReading = readingMocks.length > 0 ? (readingMocks.reduce((a,b)=>a+b, 0) / readingMocks.length) : null;
    const avgListening = listeningMocks.length > 0 ? (listeningMocks.reduce((a,b)=>a+b, 0) / listeningMocks.length) : null;
    const avgSpeaking = speakingMocks.length > 0 ? (speakingMocks.reduce((a,b)=>a+b, 0) / speakingMocks.length) : null;
    
    const latestEssay = writingHistory.length > 0 ? writingHistory[writingHistory.length - 1].band : null;
    
    if (cycleDay === 1) {
        if (avgReading !== null && avgReading < 22) {
            customRemedial = `<br><br>⚠️ <strong>Tutor Alert:</strong> Pedro, your average Reading score is <strong>${avgReading.toFixed(1)}/30</strong>. Today, prioritize scanning the text for key transitions before reading the details. Try Reading Mock 1.`;
        } else if (avgReading !== null && avgReading >= 26) {
            customRemedial = `<br><br>🌟 <strong>Tutor Alert:</strong> Excellent Reading average (<strong>${avgReading.toFixed(1)}/30</strong>). Focus on structural mapping to secure a perfect score!`;
        }
    } else if (cycleDay === 2) {
        if (avgListening !== null && avgListening < 22) {
            customRemedial = `<br><br>⚠️ <strong>Tutor Alert:</strong> Your Listening average is <strong>${avgListening.toFixed(1)}/30</strong>. Focus on taking structured, hierarchy-based notes and tracking transition words in the Geology lecture today.`;
        } else if (avgListening !== null && avgListening >= 26) {
            customRemedial = `<br><br>🌟 <strong>Tutor Alert:</strong> Great work! Your Listening average is <strong>${avgListening.toFixed(1)}/30</strong>. Today, focus on pragmatic understanding questions (inference of speaker attitude).`;
        }
    } else if (cycleDay === 3) {
        if (avgSpeaking !== null && avgSpeaking < 22) {
            customRemedial = `<br><br>⚠️ <strong>Tutor Alert:</strong> Your Speaking average is <strong>${avgSpeaking.toFixed(1)}/30</strong>. Let's practice pacing. Try speaking slightly slower to improve clarity and avoid filler words.`;
        }
    } else if (cycleDay === 4) {
        if (latestEssay !== null) {
            let essayScore = parseFloat(latestEssay);
            if (latestEssay.includes('/30')) {
                essayScore = parseFloat(latestEssay.split('/')[0]);
            }
            if (essayScore < 22) {
                customRemedial = `<br><br>⚠️ <strong>Tutor Alert:</strong> Your last essay score was <strong>${latestEssay}</strong>. In the Academic Discussion board today, directly answer the professor and refer to Kelly or Paul's points explicitly.`;
            } else if (essayScore >= 26) {
                customRemedial = `<br><br>🌟 <strong>Tutor Alert:</strong> Top writing score (<strong>${latestEssay}</strong>)! Focus on lexical diversity and syntax variety to maintain this level.`;
            }
        }
    }
    
    return `<p>${baseGuidance}${customRemedial}</p>`;
}

// --- Practice Arena Variables ---
let activePracticeType = '';
let activePracticeSection = '';
let practiceTimerInterval = null;
let practiceTimeRemaining = 0;
let practiceAudioPlaying = false;

function executeStudyPlanAction(action) {
    if (action === 'go-reading') {
        const tabBtn = document.querySelector('[data-tab="reading"]');
        if (tabBtn) tabBtn.click();
        const selector = document.getElementById('reading-mock-selector');
        if (selector) {
            selector.value = 'toefl-reading';
            loadPracticeTest('toefl-reading', 'reading');
        }
    } else if (action === 'start-reading-sim') {
        const tabBtn = document.querySelector('[data-tab="reading"]');
        if (tabBtn) tabBtn.click();
        const selector = document.getElementById('reading-mock-selector');
        startTOEFLSimulator(selector ? selector.value : 'toefl-reading');
    } else if (action === 'go-listening') {
        const tabBtn = document.querySelector('[data-tab="listening"]');
        if (tabBtn) tabBtn.click();
        const selector = document.getElementById('listening-mock-selector');
        if (selector) {
            selector.value = 'toefl-listening-tectonics';
            loadPracticeTest('toefl-listening-tectonics', 'listening');
        }
    } else if (action === 'start-listening-sim') {
        const tabBtn = document.querySelector('[data-tab="listening"]');
        if (tabBtn) tabBtn.click();
        const selector = document.getElementById('listening-mock-selector');
        startTOEFLSimulator(selector ? selector.value : 'toefl-listening-tectonics');
    } else if (action === 'go-speaking-chat') {
        const tabBtn = document.querySelector('[data-tab="speaking"]');
        if (tabBtn) tabBtn.click();
        loadScenario('university');
    } else if (action === 'start-speaking-repeat') {
        const tabBtn = document.querySelector('[data-tab="speaking"]');
        if (tabBtn) tabBtn.click();
        startTOEFLSimulator('toefl-speaking-repeat');
    } else if (action === 'start-speaking-interview') {
        const tabBtn = document.querySelector('[data-tab="speaking"]');
        if (tabBtn) tabBtn.click();
        startTOEFLSimulator('toefl-speaking-interview');
    } else if (action === 'go-writing-task1') {
        const tabBtn = document.querySelector('[data-tab="writing"]');
        if (tabBtn) tabBtn.click();
        const modeSel = document.getElementById('writing-mode-selector');
        const taskSel = document.getElementById('writing-task-selector');
        if (modeSel && taskSel) {
            modeSel.value = 'toefl';
            modeSel.dispatchEvent(new Event('change'));
            setTimeout(() => {
                taskSel.value = 'task1';
                taskSel.dispatchEvent(new Event('change'));
            }, 100);
        }
    } else if (action === 'go-writing-task2') {
        const tabBtn = document.querySelector('[data-tab="writing"]');
        if (tabBtn) tabBtn.click();
        const modeSel = document.getElementById('writing-mode-selector');
        const taskSel = document.getElementById('writing-task-selector');
        if (modeSel && taskSel) {
            modeSel.value = 'toefl';
            modeSel.dispatchEvent(new Event('change'));
            setTimeout(() => {
                taskSel.value = 'task2';
                taskSel.dispatchEvent(new Event('change'));
            }, 100);
        }
    }
}

// --- Practice Arena Functions ---
function loadPracticeTest(testType, section) {
    activePracticeType = testType;
    activePracticeSection = section;
    const testData = MOCK_TESTS[testType];
    if (!testData) return;

    // Reset audio and speaking states
    window.speechSynthesis.cancel();
    practiceAudioPlaying = false;

    if (section === 'reading') {
        const container = document.getElementById('reading-practice-arena');
        if (!container) return;

        // Hide selectors container, show practice arena
        const skillContainer = document.querySelector('#tab-reading .skill-tab-container');
        if (skillContainer) skillContainer.style.display = 'none';
        container.style.display = 'block';

        // Set title
        const practiceTitle = document.getElementById('reading-practice-title');
        if (practiceTitle) practiceTitle.textContent = testData.title;

        // Set passage text
        const practicePassage = document.getElementById('reading-practice-passage');
        if (practicePassage) practicePassage.innerHTML = testData.passage;

        // Build question form
        const form = document.getElementById('reading-practice-questions-form');
        if (form) {
            form.innerHTML = '';
            testData.questions.forEach((q, idx) => {
                const qBlock = document.createElement('div');
                qBlock.className = 'question-block';
                qBlock.style.marginBottom = '1.5rem';

                const qText = document.createElement('div');
                qText.className = 'question-text';
                qText.style.fontWeight = '600';
                qText.style.marginBottom = '0.75rem';
                qText.textContent = `${idx + 1}. ${q.text}`;
                qBlock.appendChild(qText);

                if (q.type === 'mc') {
                    q.options.forEach(opt => {
                        const label = document.createElement('label');
                        label.className = 'option-label';
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                        label.style.gap = '0.5rem';
                        label.style.margin = '0.5rem 0';
                        label.style.cursor = 'pointer';
                        label.innerHTML = `
                            <input type="radio" name="practice-q-${q.id}" value="${opt}">
                            <span>${opt}</span>
                        `;
                        qBlock.appendChild(label);
                    });
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'input-text-answer';
                    input.style.width = '100%';
                    input.style.padding = '0.5rem';
                    input.style.border = '1px solid var(--border-glass)';
                    input.style.borderRadius = '6px';
                    input.style.background = 'var(--bg-dark-900)';
                    input.style.color = 'var(--text-primary)';
                    input.name = `practice-q-${q.id}`;
                    input.placeholder = 'Type your answer here...';
                    qBlock.appendChild(input);
                }
                form.appendChild(qBlock);
            });
        }

        // Start timer
        clearInterval(practiceTimerInterval);
        practiceTimeRemaining = 1200; // 20 mins
        updatePracticeTimerDisplay('reading-practice-timer');
        practiceTimerInterval = setInterval(() => {
            practiceTimeRemaining--;
            updatePracticeTimerDisplay('reading-practice-timer');
            if (practiceTimeRemaining <= 0) {
                clearInterval(practiceTimerInterval);
                submitPracticeTest(true);
            }
        }, 1000);

    } else if (section === 'listening') {
        const container = document.getElementById('listening-practice-arena');
        if (!container) return;

        // Hide selectors container, show practice arena
        const skillContainer = document.querySelector('#tab-listening .skill-tab-container');
        if (skillContainer) skillContainer.style.display = 'none';
        container.style.display = 'block';

        // Set topic
        const topicEl = document.getElementById('listening-practice-topic');
        if (topicEl) topicEl.textContent = testData.title;

        // Set play button state
        const playBtn = document.getElementById('btn-play-listening-practice');
        if (playBtn) {
            playBtn.textContent = '🔊 Play Lecture / Audio';
            playBtn.disabled = false;
        }

        // Build question form
        const form = document.getElementById('listening-practice-questions-form');
        if (form) {
            form.innerHTML = '';
            testData.questions.forEach((q, idx) => {
                const qBlock = document.createElement('div');
                qBlock.className = 'question-block';
                qBlock.style.marginBottom = '1.5rem';

                const qText = document.createElement('div');
                qText.className = 'question-text';
                qText.style.fontWeight = '600';
                qText.style.marginBottom = '0.75rem';
                qText.textContent = `${idx + 1}. ${q.text}`;
                qBlock.appendChild(qText);

                if (q.type === 'mc') {
                    q.options.forEach(opt => {
                        const label = document.createElement('label');
                        label.className = 'option-label';
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                        label.style.gap = '0.5rem';
                        label.style.margin = '0.5rem 0';
                        label.style.cursor = 'pointer';
                        label.innerHTML = `
                            <input type="radio" name="practice-q-${q.id}" value="${opt}">
                            <span>${opt}</span>
                        `;
                        qBlock.appendChild(label);
                    });
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'input-text-answer';
                    input.style.width = '100%';
                    input.style.padding = '0.5rem';
                    input.style.border = '1px solid var(--border-glass)';
                    input.style.borderRadius = '6px';
                    input.style.background = 'var(--bg-dark-900)';
                    input.style.color = 'var(--text-primary)';
                    input.name = `practice-q-${q.id}`;
                    input.placeholder = 'Type your answer here...';
                    qBlock.appendChild(input);
                }
                form.appendChild(qBlock);
            });
        }

        // Start timer
        clearInterval(practiceTimerInterval);
        practiceTimeRemaining = 1200; // 20 mins
        updatePracticeTimerDisplay('listening-practice-timer');
        practiceTimerInterval = setInterval(() => {
            practiceTimeRemaining--;
            updatePracticeTimerDisplay('listening-practice-timer');
            if (practiceTimeRemaining <= 0) {
                clearInterval(practiceTimerInterval);
                submitPracticeTest(true);
            }
        }, 1000);
    }
}

function updatePracticeTimerDisplay(elementId) {
    const timerVal = document.getElementById(elementId);
    if (!timerVal) return;
    const min = Math.floor(practiceTimeRemaining / 60);
    const sec = practiceTimeRemaining % 60;
    timerVal.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function exitPracticeTest(section) {
    window.speechSynthesis.cancel();
    clearInterval(practiceTimerInterval);
    if (section === 'reading') {
        const container = document.getElementById('reading-practice-arena');
        if (container) container.style.display = 'none';
        const selectors = document.querySelector('#tab-reading .skill-tab-container');
        if (selectors) selectors.style.display = 'grid';
    } else if (section === 'listening') {
        const container = document.getElementById('listening-practice-arena');
        if (container) container.style.display = 'none';
        const selectors = document.querySelector('#tab-listening .skill-tab-container');
        if (selectors) selectors.style.display = 'grid';
    }
}

function submitPracticeTest(isTimeOut = false) {
    clearInterval(practiceTimerInterval);
    const testData = MOCK_TESTS[activePracticeType];
    if (!testData) return;

    let score = 0;
    const formId = activePracticeSection === 'reading' ? 'reading-practice-questions-form' : 'listening-practice-questions-form';
    const form = document.getElementById(formId);
    if (!form) return;

    const formData = new FormData(form);

    testData.questions.forEach(q => {
        const answerRaw = formData.get(`practice-q-${q.id}`);
        const answer = answerRaw ? answerRaw.trim().toLowerCase() : '';
        const correct = q.correct.toLowerCase();

        if (q.type === 'mc') {
            if (answer === correct) score++;
        } else {
            if (correct.includes(answer) && answer.length > 0) score++;
        }
    });

    let scoreBand = 0;
    if (activePracticeType.startsWith('toefl')) {
        scoreBand = Math.round((score / testData.questions.length) * 30);
    } else {
        if (score === testData.questions.length) scoreBand = 9.0;
        else if (score >= 8) scoreBand = 8.0;
        else if (score >= 6) scoreBand = 7.0;
        else if (score >= 4) scoreBand = 6.0;
        else scoreBand = 5.0;
    }

    const today = new Date().toISOString().split('T')[0];
    mockHistory.push({
        date: today,
        type: activePracticeType + '-practice',
        scoreRaw: score,
        scoreBand: scoreBand
    });
    localStorage.setItem('cerebrum_mock_history', JSON.stringify(mockHistory));

    let latest = statsHistory.length > 0 ? { ...statsHistory[statsHistory.length - 1] } : { speaking: 6.0, writing: 6.0, reading: 6.5, listening: 6.0 };
    latest.date = today;

    const convertedScore = activePracticeType.startsWith('toefl') ? (scoreBand / 30) * 9.0 : scoreBand;
    if (activePracticeSection === 'reading') {
        latest.reading = Math.round(convertedScore * 2) / 2;
        markStudyPlanTaskDone('r1');
    } else {
        latest.listening = Math.round(convertedScore * 2) / 2;
        markStudyPlanTaskDone('l1');
    }

    const index = statsHistory.findIndex(pt => pt.date === today);
    if (index !== -1) statsHistory[index] = latest;
    else statsHistory.push(latest);
    localStorage.setItem('cerebrum_stats_history', JSON.stringify(statsHistory));

    const resultMessage = isTimeOut 
        ? `Time has run out! Practice submitted. Your score: ${score}/${testData.questions.length} (Score: ${scoreBand})` 
        : `Practice test submitted successfully! Your score: ${score}/${testData.questions.length} (Estimated Score: ${scoreBand})`;
    
    alert(resultMessage);

    exitPracticeTest(activePracticeSection);
    document.querySelector('[data-tab="evolution"]').click();
}

function playPracticeListeningAudio() {
    const testData = MOCK_TESTS[activePracticeType];
    if (!testData || !testData.audioText) return;

    const playBtn = document.getElementById('btn-play-listening-practice');
    if (!playBtn) return;

    if (practiceAudioPlaying) {
        window.speechSynthesis.cancel();
        playBtn.textContent = '🔊 Play Lecture / Audio';
        practiceAudioPlaying = false;
    } else {
        playBtn.textContent = '⏹️ Stop Audio';
        practiceAudioPlaying = true;
        speakText(testData.audioText, () => {
            playBtn.textContent = '🔊 Play Lecture / Audio';
            practiceAudioPlaying = false;
        });
    }
}

// --- Daily Study Guide Wizard Functions ---
function updateStudyWizardUI(cycleDay) {
    const container = document.getElementById('study-wizard-timeline');
    if (!container) return;

    const now = Date.now();
    const dueCount = deck.filter(c => c.nextDue <= now).length;
    
    const savedChecklist = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');

    // Vocabulary is completed if cards due is 0 or manually set
    const vocabDone = !!(localStorage.getItem(`cerebrum_wizard_vocab_done_day_${cycleDay}`) === 'true' || dueCount === 0);

    const practiceTaskId = { 1: 'r1', 2: 'l1', 3: 's1', 4: 'w1' }[cycleDay];
    const practiceDone = !!savedChecklist[practiceTaskId];

    const simTaskId = { 1: 'r2', 2: 'l2', 3: 's2', 4: 'w2' }[cycleDay];
    const simDone = !!savedChecklist[simTaskId];

    let activeStep = 1;
    if (vocabDone) {
        activeStep = 2;
        if (practiceDone) {
            activeStep = 3;
            if (simDone) {
                activeStep = 4; // Complete
            }
        }
    }

    let html = '';

    // Step 1: Vocabulary
    html += `
        <div class="wizard-step ${vocabDone ? 'completed' : (activeStep === 1 ? 'active' : 'locked')}" id="wizard-step-1">
            <div class="wizard-step-marker">
                <span class="step-icon">${vocabDone ? '✓' : '1'}</span>
            </div>
            <div class="wizard-step-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <h3>Step 1: Spaced Repetition (20 min)</h3>
                    ${!vocabDone ? `<button class="btn btn-secondary btn-xs" onclick="window.markWizardVocabDone(${cycleDay})" style="font-size: 0.75rem; padding: 0.15rem 0.4rem;">Mark Done</button>` : ''}
                </div>
                <p>Review your academic words. Cards due today: <span class="badge ${dueCount > 0 ? 'badge-due' : 'badge-completed'}" id="wizard-vocab-due">${dueCount} cards</span></p>
                <div class="wizard-actions" style="margin-top: 0.75rem; display: ${activeStep === 1 ? 'block' : 'none'};">
                    <button class="btn btn-primary btn-sm" onclick="window.executeWizardAction('vocab')">Review Cards 🎴</button>
                </div>
            </div>
        </div>
    `;

    // Step 2: Practice
    const practiceLabels = {
        1: { title: 'Academic Reading Practice', desc: 'Read standard passage "Coral Reefs" and outline paragraphs.' },
        2: { title: 'Academic Listening note-taking', desc: 'Listen to "Plate Tectonics" lecture and take Cornell notes.' },
        3: { title: 'AI Conversation Partner Practice', desc: 'Have an interactive conversation with the AI about Campus Life.' },
        4: { title: 'Integrated Essay Writing', desc: 'Synthesize reading and listening passages in the Writing Arena.' }
    }[cycleDay];

    html += `
        <div class="wizard-step ${practiceDone ? 'completed' : (activeStep === 2 ? 'active' : 'locked')}" id="wizard-step-2">
            <div class="wizard-step-marker">
                <span class="step-icon">${practiceDone ? '✓' : '2'}</span>
            </div>
            <div class="wizard-step-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <h3>Step 2: Daily Skill Practice (50 min)</h3>
                    ${!practiceDone ? `<button class="btn btn-secondary btn-xs" onclick="window.markWizardPracticeDone('${practiceTaskId}', ${cycleDay})" style="font-size: 0.75rem; padding: 0.15rem 0.4rem;" ${activeStep >= 2 ? '' : 'disabled'}>Mark Done</button>` : ''}
                </div>
                <p style="font-weight: 600; color: var(--text-primary); margin: 0.2rem 0;">${practiceLabels.title}</p>
                <p>${practiceLabels.desc}</p>
                <div class="wizard-actions" style="margin-top: 0.75rem; display: ${activeStep === 2 ? 'block' : 'none'};">
                    <button class="btn btn-primary btn-sm" onclick="window.executeWizardAction('practice')">Start Practice 📖</button>
                </div>
            </div>
        </div>
    `;

    // Step 3: Simulator
    const simLabels = {
        1: { title: 'Timed Reading Simulator', desc: 'Run TOEFL Reading Mock 1 in the split-screen simulator.' },
        2: { title: 'Timed Listening Simulator', desc: 'Run TOEFL Listening Mock 1 under strict countdown limits.' },
        3: { title: 'Timed Speaking Simulator', desc: 'Execute the timed Listen & Repeat or Campus Interview simulation.' },
        4: { title: 'Classroom Forum Essay', desc: 'Submit a contribution answering the professor on the Discussion Board.' }
    }[cycleDay];

    html += `
        <div class="wizard-step ${simDone ? 'completed' : (activeStep === 3 ? 'active' : 'locked')}" id="wizard-step-3">
            <div class="wizard-step-marker">
                <span class="step-icon">${simDone ? '✓' : '3'}</span>
            </div>
            <div class="wizard-step-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <h3>Step 3: Timed Exam Simulator (20 min)</h3>
                    ${!simDone ? `<button class="btn btn-secondary btn-xs" onclick="window.markWizardSimDone('${simTaskId}', ${cycleDay})" style="font-size: 0.75rem; padding: 0.15rem 0.4rem;" ${activeStep >= 3 ? '' : 'disabled'}>Mark Done</button>` : ''}
                </div>
                <p style="font-weight: 600; color: var(--text-primary); margin: 0.2rem 0;">${simLabels.title}</p>
                <p>${simLabels.desc}</p>
                <div class="wizard-actions" style="margin-top: 0.75rem; display: ${activeStep === 3 ? 'block' : 'none'};">
                    <button class="btn btn-primary btn-sm" onclick="window.executeWizardAction('simulator')">Start Simulator ⚡</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

window.markWizardVocabDone = function(cycleDay) {
    localStorage.setItem(`cerebrum_wizard_vocab_done_day_${cycleDay}`, 'true');
    updateStudyPlanUI();
};

window.markWizardPracticeDone = function(taskId, cycleDay) {
    const savedState = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');
    savedState[taskId] = true;
    localStorage.setItem(`cerebrum_checklist_state_day_${cycleDay}`, JSON.stringify(savedState));
    updateStudyPlanUI();
};

window.markWizardSimDone = function(taskId, cycleDay) {
    const savedState = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');
    savedState[taskId] = true;
    localStorage.setItem(`cerebrum_checklist_state_day_${cycleDay}`, JSON.stringify(savedState));
    updateStudyPlanUI();
};

window.executeWizardAction = function(actionType) {
    const cycleDay = parseInt(localStorage.getItem('cerebrum_current_cycle_day') || '1', 10);
    if (actionType === 'vocab') {
        const vocabTab = document.querySelector('[data-tab="vocabulary"]');
        if (vocabTab) vocabTab.click();
    } else if (actionType === 'practice') {
        const action = { 1: 'go-reading', 2: 'go-listening', 3: 'go-speaking-chat', 4: 'go-writing-task1' }[cycleDay];
        executeStudyPlanAction(action);
    } else if (actionType === 'simulator') {
        const action = { 1: 'start-reading-sim', 2: 'start-listening-sim', 3: 'start-speaking-repeat', 4: 'go-writing-task2' }[cycleDay];
        executeStudyPlanAction(action);
    }
};

function markStudyPlanTaskDone(taskId) {
    const cycleDay = parseInt(localStorage.getItem('cerebrum_current_cycle_day') || '1', 10);
    const savedState = JSON.parse(localStorage.getItem(`cerebrum_checklist_state_day_${cycleDay}`) || '{}');
    savedState[taskId] = true;
    localStorage.setItem(`cerebrum_checklist_state_day_${cycleDay}`, JSON.stringify(savedState));
    updateStudyPlanUI();
}

// Load YouTube Iframe Player API dynamically
(function() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();

window.onYouTubeIframeAPIReady = function() {
    toeflYTPlayerReady = true;
    console.log("YouTube Iframe API initialized and ready.");
};
