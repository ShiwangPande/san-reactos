// Replaced AI service with static generators
const NPC_DIALOGUES = {
  civilian: [
    "Hey! Watch where you're going!",
    "Nice car, buddy!",
    "Can't a guy walk here?",
    "Man, this city is crazy.",
    "I gotta get to work.",
    "Did you see the game last night?",
    "Whoa, easy there!",
    "Get a job!",
    "I love this song!",
    "Weather's nice today."
  ],
  groves: [
    "Green until I die, homie.",
    "What's crackin'?",
    "Protect the hood.",
    "Looking out for the family.",
    "Respect.",
    "GSF for life.",
    "We own these streets."
  ],
  ballas: [
    "Wrong neighborhood, fool.",
    "Purple reign!",
    "Get out of here.",
    "You want some trouble?",
    "Ballas styling.",
    "Watch your back."
  ],
  police: [
    "Move along, citizen.",
    "Don't cause trouble.",
    "I'm watching you.",
    "Dispatch, all quiet here.",
    "Keep it moving.",
    "Obey the law."
  ],
  default: [
    "Huh?",
    "Whatever.",
    "Hello.",
    "See ya."
  ]
};

const MISSIONS = [
    { title: "Turf War", description: "Take out the rival gang members at the park." },
    { title: "Delivery Run", description: "Deliver the package to the docks in under 2 minutes." },
    { title: "Car Jacking", description: "Steal a blue sports car and bring it to the garage." },
    { title: "Street Race", description: "Win the race around the downtown block." },
    { title: "Protection", description: "Defend the shop from looters." },
    { title: "Payback", description: "Teach the Ballas a lesson." },
    { title: "Joyride", description: "Drive at top speed for 30 seconds without crashing." },
    { title: "Taxi Duty", description: "Pick up a fare and drop them off safely." },
    { title: "Heist Prep", description: "Scout the bank downtown for security cameras." },
    { title: "Vigilante", description: "Stop the fleeing criminal vehicle." }
];

export const generateNpcDialogue = async (
  npcRole: string,
  situation: string,
  playerAction: string
): Promise<string> => {
  // Simulate slight delay for "processing" feel
  await new Promise(resolve => setTimeout(resolve, 50));

  const roleKey = npcRole.toLowerCase();
  // Safe access with fallback
  const lines = (NPC_DIALOGUES as any)[roleKey] || NPC_DIALOGUES.default;
  return lines[Math.floor(Math.random() * lines.length)];
};

export const generateMission = async (): Promise<{ title: string; description: string }> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
};