export type WordNote = { meaning: string; nuance: string; example: string };

// Handwritten learning examples, not generated or context-aware AI results.
export const wordNotes: Record<string, WordNote> = {
  attention: { meaning: "注意力；专注", nuance: "pay attention 表示主动留意。文中将深度阅读与专注联系起来。", example: "Pay attention to how the writer begins the story." },
  invites: { meaning: "邀请；促使", nuance: "invite someone to do something：邀请某人做某事，也可以比喻某事物引导我们行动。", example: "The poem invites us to see the world differently." },
  doorway: { meaning: "门口；通往某处的入口", nuance: "示例文章中是比喻：一句话可以成为进入另一种生活或思想的入口。", example: "Books can be a doorway into unfamiliar worlds." },
  unfamiliar: { meaning: "不熟悉的；陌生的", nuance: "un- 表示否定，familiar 表示熟悉。可以描述想法、地方或经历。", example: "She paused to look up an unfamiliar word." },
  rhythm: { meaning: "节奏；韵律", nuance: "可以用于音乐，也可描述语言中轻重、长短和停顿的规律。", example: "Read the passage aloud to hear its rhythm." },
  passage: { meaning: "（文章中的）一段", nuance: "阅读场景中的 passage 通常指一段文字；在其他语境里也可能指通道。", example: "Read the passage again before answering." },
  understanding: { meaning: "理解；领会", nuance: "不仅是认识单词，也包括把握文字之间的联系和含义。", example: "Discussion deepens our understanding of the story." },
  valuable: { meaning: "有价值的；宝贵的", nuance: "可以描述金钱价值，也可以描述想法、时间和经验的重要性。", example: "Asking questions is a valuable part of learning." },
  deeply: { meaning: "深入地；深深地", nuance: "deep 的副词形式。在 read deeply 中表示深入理解与思考。", example: "Reading deeply takes patience and curiosity." },
  quiet: { meaning: "安静的；平静的", nuance: "不仅可以表示没有声音，也可表达内心平静、细微而不张扬。", example: "Find a quiet moment to finish the chapter." },
};

export const sentenceNotes: Record<string, { translation: string; structure: string; question: string }> = {
  "In a world that moves quickly, reading invites us to slow down.": {
    translation: "在一个快速运转的世界里，阅读邀请我们放慢脚步。",
    structure: "In a world… 是背景状语；that moves quickly 修饰 world；主句是 reading invites us to slow down。",
    question: "快速的世界与慢下来的阅读形成了怎样的对比？",
  },
  "To read deeply is to pay attention.": {
    translation: "深入阅读，就是专注。",
    structure: "To read deeply 是不定式短语作主语；is 连接主语与表语 to pay attention。",
    question: "作者为什么把深度阅读和注意力联系在一起？",
  },
  "Understanding grows in these quiet moments.": {
    translation: "理解在这些安静的时刻逐渐生长。",
    structure: "Understanding 是主语，grows 是谓语，in these quiet moments 是状语。grow 将抽象的理解比作会生长的事物。",
    question: "these quiet moments 指的是前文哪些阅读行为？",
  },
};

export function splitArticle(text: string) {
  const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
  const words = new Intl.Segmenter("en", { granularity: "word" });
  return text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => ({
    id: `p${paragraphIndex}`,
    sentences: Array.from(sentences.segment(paragraph), (sentence, sentenceIndex) => ({
      id: `p${paragraphIndex}-s${sentenceIndex}`,
      text: sentence.segment,
      words: Array.from(words.segment(sentence.segment), (word) => ({
        text: word.segment, isWord: Boolean(word.isWordLike), offset: word.index,
      })),
    })),
  }));
}
