export interface MockAnswerOption {
  _id: string;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface MockDetailedAnswer {
  index: number;
  question_id: string;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation: string;
  options: MockAnswerOption[];
  selected_option_id: string | null;
  is_correct: boolean;
}

export interface MockAttemptDetail {
  _id: string;
  practice_title: string;
  subject_name: string;
  topic_name: string;
  score: number;
  total_correct: number;
  total_wrong: number;
  total_questions: number;
  duration_seconds: number;
  submit_time: string;
  answers: MockDetailedAnswer[];
}

export const mockAttemptDetail: MockAttemptDetail = {
  _id: "mock-attempt-20261118-001",
  practice_title: "Ôn tập: Phương trình bậc hai",
  subject_name: "Toán học",
  topic_name: "Phương trình bậc hai",
  score: 6,
  total_correct: 3,
  total_wrong: 2,
  total_questions: 5,
  duration_seconds: 425,
  submit_time: "2026-11-18T09:30:00.000Z",
  answers: [
    {
      index: 1,
      question_id: "mock-question-001",
      content: "Phương trình x² - 5x + 6 = 0 có hai nghiệm là gì?",
      difficulty_level: "easy",
      explanation:
        "Ta phân tích x² - 5x + 6 = (x - 2)(x - 3) = 0. Vậy phương trình có hai nghiệm x = 2 và x = 3.",
      options: [
        { _id: "mock-q1-a", option_label: "A", content: "x = 2 và x = 3", is_correct: true },
        { _id: "mock-q1-b", option_label: "B", content: "x = -2 và x = -3", is_correct: false },
        { _id: "mock-q1-c", option_label: "C", content: "x = 1 và x = 6", is_correct: false },
        { _id: "mock-q1-d", option_label: "D", content: "Phương trình vô nghiệm", is_correct: false },
      ],
      selected_option_id: "mock-q1-a",
      is_correct: true,
    },
    {
      index: 2,
      question_id: "mock-question-002",
      content: "Biệt thức Δ của phương trình ax² + bx + c = 0 được tính bằng công thức nào?",
      difficulty_level: "easy",
      explanation:
        "Với phương trình ax² + bx + c = 0, biệt thức chuẩn được tính bằng Δ = b² - 4ac.",
      options: [
        { _id: "mock-q2-a", option_label: "A", content: "Δ = b² + 4ac", is_correct: false },
        { _id: "mock-q2-b", option_label: "B", content: "Δ = b² - 2ac", is_correct: false },
        { _id: "mock-q2-c", option_label: "C", content: "Δ = a² - 4bc", is_correct: false },
        { _id: "mock-q2-d", option_label: "D", content: "Δ = b² - 4ac", is_correct: true },
      ],
      selected_option_id: "mock-q2-b",
      is_correct: false,
    },
    {
      index: 3,
      question_id: "mock-question-003",
      content: "Phương trình x² + 4x + 4 = 0 có nghiệm kép bằng bao nhiêu?",
      difficulty_level: "medium",
      explanation:
        "Ta có x² + 4x + 4 = (x + 2)² = 0, nên phương trình có nghiệm kép x = -2.",
      options: [
        { _id: "mock-q3-a", option_label: "A", content: "x = 2", is_correct: false },
        { _id: "mock-q3-b", option_label: "B", content: "x = -2", is_correct: true },
        { _id: "mock-q3-c", option_label: "C", content: "x = 4", is_correct: false },
        { _id: "mock-q3-d", option_label: "D", content: "x = -4", is_correct: false },
      ],
      selected_option_id: null,
      is_correct: false,
    },
    {
      index: 4,
      question_id: "mock-question-004",
      content: "Nếu Δ < 0 thì phương trình bậc hai có bao nhiêu nghiệm thực?",
      difficulty_level: "medium",
      explanation:
        "Khi Δ < 0, phương trình bậc hai không có nghiệm thực.",
      options: [
        { _id: "mock-q4-a", option_label: "A", content: "Hai nghiệm phân biệt", is_correct: false },
        { _id: "mock-q4-b", option_label: "B", content: "Một nghiệm kép", is_correct: false },
        { _id: "mock-q4-c", option_label: "C", content: "Không có nghiệm thực", is_correct: true },
        { _id: "mock-q4-d", option_label: "D", content: "Luôn có một nghiệm thực", is_correct: false },
      ],
      selected_option_id: "mock-q4-c",
      is_correct: true,
    },
    {
      index: 5,
      question_id: "mock-question-005",
      content: "Tổng hai nghiệm của phương trình x² - 7x + 10 = 0 bằng bao nhiêu?",
      difficulty_level: "hard",
      explanation:
        "Theo định lý Viète, tổng hai nghiệm của ax² + bx + c = 0 là -b/a. Ở đây a = 1, b = -7 nên tổng hai nghiệm bằng 7.",
      options: [
        { _id: "mock-q5-a", option_label: "A", content: "7", is_correct: true },
        { _id: "mock-q5-b", option_label: "B", content: "-7", is_correct: false },
        { _id: "mock-q5-c", option_label: "C", content: "10", is_correct: false },
        { _id: "mock-q5-d", option_label: "D", content: "-10", is_correct: false },
      ],
      selected_option_id: "mock-q5-a",
      is_correct: true,
    },
  ],
};
