// A comprehensive list of words that should be filtered in the workspace feed
// This list contains mild to severe inappropriate language

export const badWords = [
  // Mild insults
  "dumb", "stupid", "idiot", "moron", "fool", "loser", "weirdo", "creep", "jerk",
  "annoying", "lame", "pathetic", "useless", "worthless", "incompetent", "lazy",
  "boring", "weird", "awkward", "loner", "nerd", "geek", "wimp", "coward",
  "failure", "amateur", "noob", "ignorant", "silly", "ridiculous", "absurd",
  
  // Disrespectful terms
  "boomer", "karen", "snowflake", "troll", "hater", "wannabe", "poser", "fake",
  "phony", "pretender", "fraud", "imposter", "copycat", "sellout", "traitor",
  "snitch", "rat", "snake", "backstabber", "gossip", "drama", "toxic",
  
  // Appearance-related insults
  "ugly", "fat", "skinny", "short", "bald", "wrinkled", "gross", "disgusting",
  "hideous", "unattractive", "sloppy", "messy", "dirty", "smelly", "stinky",
  
  // Intelligence-related insults
  "brainless", "clueless", "mindless", "senseless", "thoughtless", "dense",
  "dim", "slow", "simple", "simpleton", "airhead", "birdbrain", "numbskull",
  "dunce", "dimwit", "halfwit", "nitwit", "blockhead", "bonehead", "dullard",
  
  // Behavior-related insults
  "childish", "immature", "juvenile", "petty", "bratty", "spoiled", "entitled",
  "selfish", "greedy", "stingy", "arrogant", "conceited", "egotistical", "vain",
  "narcissistic", "self-centered", "pompous", "pretentious", "snob", "elitist",
  
  // Personality-related insults
  "bossy", "controlling", "demanding", "pushy", "stubborn", "obstinate", "pig-headed",
  "close-minded", "narrow-minded", "judgmental", "critical", "negative", "pessimistic",
  "cynical", "bitter", "jealous", "envious", "resentful", "spiteful", "vindictive",
  
  // Dishonesty-related terms
  "liar", "dishonest", "deceitful", "deceptive", "manipulative", "untrustworthy",
  "unreliable", "undependable", "flaky", "sketchy", "shady", "suspicious", "crooked",
  "corrupt", "cheater", "thief", "crook", "con", "scammer", "fraudster",
  
  // Rudeness-related terms
  "rude", "impolite", "disrespectful", "inconsiderate", "thoughtless", "tactless",
  "insensitive", "cruel", "mean", "nasty", "vicious", "malicious", "heartless",
  "cold", "callous", "ruthless", "merciless", "savage", "brutal", "harsh",
  
  // Competence-related insults
  "inept", "incapable", "ineffective", "inefficient", "unqualified", "unskilled",
  "inexperienced", "unprofessional", "sloppy", "careless", "negligent", "irresponsible",
  "unreliable", "undependable", "untrustworthy", "mediocre", "subpar", "inferior",
  
  // More severe inappropriate language
  "crap", "sucks", "shut up", "screw", "hell", "damn", "goddamn", "darn", "freaking",
  "frick", "heck", "jerk", "butt", "ass", "asshole", "bastard", "bitch", "shit", 
  "bullshit", "piss", "dick", "cock", "penis", "vagina", "pussy", "tits", "boobs",
  "whore", "slut", "hooker", "hoe", "thot", "skank", "tramp", "prostitute",
  "retard", "retarded", "spaz", "cunt", "twat", "fag", "faggot", "queer", "homo",
  "dyke", "lesbo", "pedo", "perv", "pervert", "molester", "rapist", "nazi",
  "kill", "murder", "suicide", "die", "death", "dead", "hate", "kys",
  
  // Racial/ethnic slurs (censored versions)
  "n-word", "c-word", "k-word", "j-word", "g-word", "s-word", "w-word", "m-word",
  "racist", "bigot", "prejudice", "discrimination", "supremacist"
];

// Function to check if a message contains any bad words
export function containsBadWords(message: string): { contains: boolean; words: string[] } {
  const lowerMessage = message.toLowerCase();
  const foundWords: string[] = [];
  
  for (const word of badWords) {
    // Check for whole word matches using word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerMessage)) {
      foundWords.push(word);
    }
  }
  
  return {
    contains: foundWords.length > 0,
    words: foundWords
  };
}
