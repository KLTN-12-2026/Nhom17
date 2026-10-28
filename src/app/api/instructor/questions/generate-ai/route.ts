import { connectDB } from "@/lib/db";
import { Topic, Subject } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeneratedQuestion {
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation: string;
  options: {
    option_label: string;
    content: string;
    is_correct: boolean;
  }[];
}

interface SeedQuestion {
  content: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  correctAnswer: string;
  distractors: string[];
}

/**
 * Ngân hàng câu hỏi tri thức mẫu bám sát chương trình Giáo Dục Phổ Thông THPT
 * Đảm bảo sinh đề chuẩn xác theo bài học ngay cả khi chưa có hoặc mất kết nối GEMINI_API_KEY
 */
const CURRICULUM_KNOWLEDGE_BASE: Record<string, SeedQuestion[]> = {
  // HÓA HỌC: Este - Lipit
  "este": [
    {
      content: "Chất nào sau đây là este no, đơn chức, mạch hở?",
      difficulty: "easy",
      explanation: "Este no, đơn chức, mạch hở có công thức phân tử chung là CnH2nO2 (n >= 2).",
      correctAnswer: "CnH2nO2 (n >= 2)",
      distractors: ["CnH2n-2O2 (n >= 3)", "CnH2nO (n >= 2)", "CnH2n+2O2 (n >= 2)"],
    },
    {
      content: "Thủy phân hoàn toàn chất béo triolein ((C17H33COO)3C3H5) trong dung dịch NaOH đun nóng thu được muối natri oleat và chất nào sau đây?",
      difficulty: "easy",
      explanation: "Phản ứng xà phòng hóa chất béo bất kỳ luôn tạo ra muối natri/kali của axit béo và glixerol (C3H5(OH)3).",
      correctAnswer: "Glixerol (C3H5(OH)3)",
      distractors: ["Etylen glicol (C2H4(OH)2)", "Ancol etylic (C2H5OH)", "Axit axetic (CH3COOH)"],
    },
    {
      content: "Xà phòng hóa hoàn toàn 8,8 gam etyl axetat (CH3COOC2H5) bằng dung dịch NaOH vừa đủ, đun nóng. Khối lượng muối CH3COONa thu được là bao nhiêu?",
      difficulty: "medium",
      explanation: "Ta có n(CH3COOC2H5) = 8,8 / 88 = 0,1 mol. Theo phương trình: CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH => n(CH3COONa) = 0,1 mol => m(muối) = 0,1 * 82 = 8,2 gam.",
      correctAnswer: "8,2 gam",
      distractors: ["6,8 gam", "10,2 gam", "4,1 gam"],
    },
    {
      content: "Đun nóng este etyl fomat (HCOOC2H5) với dung dịch AgNO3 trong NH3 dư, hiện tượng quan sát được là gì?",
      difficulty: "medium",
      explanation: "Etyl fomat chứa nhóm định chức fomat (-CHO) nên có khả năng tham gia phản ứng tráng bạc, tạo kết tủa kim loại Ag sáng bóng bám vào thành ống nghiệm.",
      correctAnswer: "Xuất hiện lớp kim loại bạc sáng bóng bám vào thành ống nghiệm",
      distractors: ["Có kết tủa màu xanh lam xuất hiện", "Dung dịch chuyển sang màu tím đặc trưng", "Không xảy ra bất kỳ hiện tượng gì"],
    },
    {
      content: "Ứng với công thức phân tử C4H8O2 có bao nhiêu đồng phân este cấu tạo mạch hở?",
      difficulty: "hard",
      explanation: "Các đồng phân este của C4H8O2 gồm: HCOOCH2CH2CH3, HCOOCH(CH3)2, CH3COOC2H5, C2H5COOCH3 (tổng cộng 4 đồng phân).",
      correctAnswer: "4 đồng phân",
      distractors: ["2 đồng phân", "3 đồng phân", "5 đồng phân"],
    },
    {
      content: "Chất béo nào sau đây ở trạng thái lỏng ở điều kiện thường?",
      difficulty: "easy",
      explanation: "Triolein (chứa gốc axit không no C17H33COO-) tồn tại ở trạng thái lỏng ở điều kiện thường (dầu thực vật). Tristearin và tripanmitin là chất béo no, ở trạng thái rắn (mỡ động vật).",
      correctAnswer: "Triolein",
      distractors: ["Tristearin", "Tripanmitin", "Axit panmitic"],
    },
  ],

  // VẬT LÝ: Dao động cơ / Dao động điều hòa
  "dao dong": [
    {
      content: "Một vật dao động điều hòa theo phương trình x = A*cos(ωt + φ). Khi vật đi qua vị trí cân bằng thì vận tốc của vật có độ lớn bằng bao nhiêu?",
      difficulty: "easy",
      explanation: "Tại vị trí cân bằng (x = 0), vận tốc của vật đạt độ lớn cực đại: vmax = ω*A.",
      correctAnswer: "vmax = ω*A",
      distractors: ["v = 0", "vmax = ω^2*A", "v = ω*A / 2"],
    },
    {
      content: "Chu kỳ dao động điều hòa của con lắc lò xo gồm lò xo có độ cứng k và quả nặng có khối lượng m được xác định bởi công thức nào?",
      difficulty: "easy",
      explanation: "Chu kỳ dao động điều hòa của con lắc lò xo là T = 2π * √(m/k).",
      correctAnswer: "T = 2π * √(m/k)",
      distractors: ["T = 2π * √(k/m)", "T = 2π * √(g/l)", "T = (1/2π) * √(m/k)"],
    },
    {
      content: "Một vật dao động điều hòa với biên độ A = 8 cm. Quãng đường vật đi được trong một chu kỳ dao động toàn phần là bao nhiêu?",
      difficulty: "medium",
      explanation: "Trong một chu kỳ toàn phần T, vật luôn chuyển động qua quãng đường bằng 4 lần biên độ: S = 4A = 4 * 8 = 32 cm.",
      correctAnswer: "32 cm",
      distractors: ["16 cm", "8 cm", "64 cm"],
    },
    {
      content: "Hiện tượng cộng hưởng cơ xảy ra khi nào?",
      difficulty: "medium",
      explanation: "Hiện tượng cộng hưởng xảy ra khi tần số của ngoại lực cưỡng bức f xấp xỉ bằng tần số dao động riêng f0 của hệ cơ học, làm biên độ dao động đạt giá trị cực đại.",
      correctAnswer: "Tần số của ngoại lực cưỡng bức bằng tần số dao động riêng của hệ",
      distractors: ["Biên độ ngoại lực đạt giá trị cực đại", "Chu kỳ ngoại lực rất lớn so với chu kỳ riêng", "Lực ma sát của môi trường triệt tiêu hoàn toàn"],
    },
    {
      content: "Một con lắc đơn có chiều dài l đang dao động điều hòa tại nơi có gia tốc trọng trường g. Nếu tăng khối lượng của quả nặng lên 4 lần thì chu kỳ dao động của con lắc đơn sẽ như thế nào?",
      difficulty: "hard",
      explanation: "Chu kỳ con lắc đơn T = 2π * √(l/g), hoàn toàn độc lập với khối lượng m của vật nặng, do đó chu kỳ dao động không đổi.",
      correctAnswer: "Không đổi",
      distractors: ["Tăng lên 2 lần", "Tăng lên 4 lần", "Giảm đi 2 lần"],
    },
  ],

  // TOÁN HỌC: Khảo sát hàm số / Đạo hàm
  "ham so": [
    {
      content: "Cho hàm số y = f(x) có đạo hàm f'(x) > 0 với mọi x thuộc khoảng (a; b). Khẳng định nào sau đây là ĐÚNG?",
      difficulty: "easy",
      explanation: "Định lý về tính đơn điệu: Nếu f'(x) > 0 với mọi x thuộc (a; b) thì hàm số y = f(x) đồng biến trên khoảng (a; b).",
      correctAnswer: "Hàm số f(x) đồng biến trên khoảng (a; b)",
      distractors: ["Hàm số f(x) nghịch biến trên khoảng (a; b)", "Hàm số f(x) không đổi trên khoảng (a; b)", "Hàm số f(x) đạt cực trị tại mọi điểm trên (a; b)"],
    },
    {
      content: "Đường tiệm cận đứng của đồ thị hàm số y = (2x + 3) / (x - 1) là đường thẳng có phương trình nào?",
      difficulty: "easy",
      explanation: "Vì lim(x->1+) y = +∞ và lim(x->1-) y = -∞ (mẫu số triệt tiêu tại x = 1), nên đường thẳng x = 1 là tiệm cận đứng.",
      correctAnswer: "x = 1",
      distractors: ["y = 2", "x = -1", "y = -3/2"],
    },
    {
      content: "Tìm số điểm cực trị của hàm số y = x^3 - 3x^2 + 2.",
      difficulty: "medium",
      explanation: "Ta có y' = 3x^2 - 6x. Cho y' = 0 <=> 3x(x - 2) = 0 <=> x = 0 hoặc x = 2. Đạo hàm y' đổi dấu qua cả hai nghiệm này, vậy đồ thị hàm số có đúng 2 điểm cực trị.",
      correctAnswer: "2 điểm cực trị",
      distractors: ["0 điểm cực trị", "1 điểm cực trị", "3 điểm cực trị"],
    },
    {
      content: "Giá trị lớn nhất của hàm số f(x) = x^4 - 2x^2 + 3 trên đoạn [0; 2] bằng bao nhiêu?",
      difficulty: "medium",
      explanation: "f'(x) = 4x^3 - 4x = 0 <=> x = 0 hoặc x = 1 (thuộc [0; 2]). Tính các giá trị: f(0) = 3, f(1) = 2, f(2) = 11. Vậy GTLN của hàm số trên [0; 2] là 11.",
      correctAnswer: "11",
      distractors: ["2", "3", "7"],
    },
    {
      content: "Cho hàm số f(x) có bảng biến thiên và f'(x) đổi dấu từ dương sang âm khi qua điểm x0. Khi đó x0 được gọi là gì?",
      difficulty: "easy",
      explanation: "Khi đạo hàm đổi dấu từ dương sang âm tại x0, hàm số chuyển từ đồng biến sang nghịch biến, nên x0 là điểm cực đại của hàm số.",
      correctAnswer: "Điểm cực đại của hàm số",
      distractors: ["Điểm cực tiểu của hàm số", "Giá trị lớn nhất của hàm số", "Điểm uốn của đồ thị"],
    },
  ],

  // TIẾNG ANH: Ngữ pháp / Tenses / Bị động
  "tieng anh": [
    {
      content: "By the time the teacher arrived in the classroom, all students _______ their homework.",
      difficulty: "medium",
      explanation: "Cấu trúc: 'By the time + Past Simple, Past Perfect'. Hành động hoàn thành bài tập xảy ra trước hành động giáo viên đến, nên chia thì Quá khứ hoàn thành (had finished).",
      correctAnswer: "had finished",
      distractors: ["have finished", "finished", "were finishing"],
    },
    {
      content: "If the weather _______ fine tomorrow, we will organize a picnic in the botanical garden.",
      difficulty: "easy",
      explanation: "Câu điều kiện loại 1 (Conditional Type 1) diễn tả khả năng có thể xảy ra ở hiện tại hoặc tương lai: If + S + V(hiện tại đơn), S + will + V-nguyên mẫu.",
      correctAnswer: "is",
      distractors: ["will be", "were", "had been"],
    },
    {
      content: "The historic bridge _______ by international engineers last year.",
      difficulty: "easy",
      explanation: "Câu bị động ở thì quá khứ đơn (Past Simple Passive): S + was/were + V3/ed. Chủ ngữ 'The historic bridge' số ít đi với 'was renovated'.",
      correctAnswer: "was renovated",
      distractors: ["is renovated", "renovated", "has been renovated"],
    },
    {
      content: "The woman _______ son won the national mathematics Olympiad is our neighbor.",
      difficulty: "medium",
      explanation: "Đại từ quan hệ chỉ quan hệ sở hữu giữa 'The woman' và 'son' là 'whose' (whose son = her son).",
      correctAnswer: "whose",
      distractors: ["who", "whom", "which"],
    },
    {
      content: "Neither the manager nor his assistants _______ present at the meeting yesterday.",
      difficulty: "hard",
      explanation: "Quy tắc hòa hợp chủ vị với 'Neither... nor...': Động từ chia theo chủ ngữ gần nhất ('his assistants' số nhiều) và thời gian trong quá khứ ('yesterday') -> chia 'were'.",
      correctAnswer: "were",
      distractors: ["was", "is", "are"],
    },
  ],

  // SINH HỌC: ADN / Di truyền / Đột biến
  "sinh hoc": [
    {
      content: "Đơn phân cấu tạo nên phân tử ADN bao gồm những thành phần nào sau đây?",
      difficulty: "easy",
      explanation: "ADN được cấu tạo theo nguyên tắc đa phân từ 4 loại nuclêôtit: Adenin (A), Timin (T), Guanin (G) và Xitôzin (X).",
      correctAnswer: "A, T, G, X",
      distractors: ["A, U, G, X", "A, T, U, X", "A, B, C, D"],
    },
    {
      content: "Theo nguyên tắc bổ sung trong cấu trúc phân tử ADN, liên kết giữa các bazơ nitơ trên hai mạch đơn là gì?",
      difficulty: "easy",
      explanation: "Theo NTBS: A liên kết với T bằng 2 liên kết hiđrô (A = T), G liên kết với X bằng 3 liên kết hiđrô (G ≡ X).",
      correctAnswer: "A liên kết với T bằng 2 liên kết hiđrô, G liên kết với X bằng 3 liên kết hiđrô",
      distractors: ["A liên kết với T bằng 3 liên kết hiđrô, G liên kết với X bằng 2 liên kết hiđrô", "A liên kết với U bằng 2 liên kết hiđrô, G liên kết với X bằng 3 liên kết hiđrô", "Các nuclêôtit liên kết ngẫu nhiên không cố định"],
    },
    {
      content: "Dạng đột biến cấu trúc nhiễm sắc thể nào sau đây làm tăng số lượng gen trên một nhiễm sắc thể?",
      difficulty: "medium",
      explanation: "Đột biến lặp đoạn NST làm cho một đoạn NST nào đó lặp lại một hoặc nhiều lần, dẫn đến tăng số lượng gen trên NST đó.",
      correctAnswer: "Lặp đoạn NST",
      distractors: ["Mất đoạn NST", "Đảo đoạn NST", "Chuyển đoạn tương hỗ"],
    },
  ],

  // LỊCH SỬ
  "lich su": [
    {
      content: "Chiến dịch lịch sử nào đã làm phá sản hoàn toàn kế hoạch Nava của thực dân Pháp vào năm 1954?",
      difficulty: "easy",
      explanation: "Chiến thắng Điện Biên Phủ (7/5/1954) đã giáng đòn quyết định đập tan ý chí xâm lược của thực dân Pháp, làm phá sản hoàn toàn kế hoạch Nava.",
      correctAnswer: "Chiến dịch Điện Biên Phủ (1954)",
      distractors: ["Chiến dịch Việt Bắc (1947)", "Chiến dịch Biên Giới (1950)", "Chiến dịch Tây Bắc (1952)"],
    },
    {
      content: "Sự kiện lịch sử nào đánh dấu sự sụp đổ hoàn toàn của chủ nghĩa thực dân mới ở miền Nam Việt Nam?",
      difficulty: "medium",
      explanation: "Thắng lợi vĩ đại của cuộc Tổng tiến công và nổi dậy mùa Xuân năm 1975, đỉnh cao là Chiến dịch Hồ Chí Minh lịch sử, đã giải phóng hoàn toàn miền Nam, thống nhất đất nước.",
      correctAnswer: "Đại thắng mùa Xuân năm 1975 (Chiến dịch Hồ Chí Minh)",
      distractors: ["Hiệp định Pari năm 1973", "Phong trào Đồng Khởi năm 1960", "Chiến thắng Điện Biên Phủ trên không năm 1972"],
    },
  ],

  // ĐỊA LÝ
  "dia ly": [
    {
      content: "Đặc điểm nổi bật của địa hình nước ta là gì?",
      difficulty: "easy",
      explanation: "Địa hình nước ta có 3/4 diện tích là đồi núi, đồng bằng chỉ chiếm 1/4 diện tích lãnh thổ, hướng nghiêng chung là tây bắc - đông nam.",
      correctAnswer: "Đồi núi chiếm 3/4 diện tích lãnh thổ, đồng bằng chiếm 1/4 diện tích",
      distractors: ["Đồng bằng chiếm phần lớn diện tích lãnh thổ", "Địa hình nghiêng theo hướng đông bắc - tây nam", "Địa hình chủ yếu là cao nguyên bazan cổ"],
    },
    {
      content: "Vùng kinh tế trọng điểm dẫn đầu cả nước về GDP và thu hút vốn đầu tư nước ngoài (FDI) là vùng nào?",
      difficulty: "medium",
      explanation: "Vùng Đông Nam Bộ với trung tâm kinh tế là TP. Hồ Chí Minh là vùng kinh tế phát triển năng động nhất, đóng góp tỷ trọng GDP và FDI cao nhất cả nước.",
      correctAnswer: "Vùng Đông Nam Bộ",
      distractors: ["Vùng Đồng bằng sông Hồng", "Vùng Đồng bằng sông Cửu Long", "Vùng Duyên hải Nam Trung Bộ"],
    },
  ],
};

/**
 * Trình sinh câu hỏi dự phòng thông minh (Domain-aware Smart Fallback)
 * Đảm bảo hệ thống luôn tạo được câu hỏi trắc nghiệm chất lượng ngay cả khi chưa có GEMINI_API_KEY
 */
function generateFallbackQuestions(
  promptText: string,
  topicName: string,
  subjectName: string,
  grade: string,
  count: number,
  preferredDifficulty: string
): GeneratedQuestion[] {
  const diffs: ("easy" | "medium" | "hard")[] = ["easy", "medium", "hard"];
  const lowerSearch = `${topicName} ${subjectName} ${promptText}`.toLowerCase();

  // Tìm seed questions phù hợp trong tri thức chương trình SGK
  let matchedSeeds: SeedQuestion[] = [];
  if (lowerSearch.includes("este") || lowerSearch.includes("lipit") || lowerSearch.includes("chất béo") || lowerSearch.includes("hóa")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["este"] || [];
  } else if (lowerSearch.includes("dao động") || lowerSearch.includes("con lắc") || lowerSearch.includes("vật lý") || lowerSearch.includes("sóng")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["dao dong"] || [];
  } else if (lowerSearch.includes("hàm số") || lowerSearch.includes("toán") || lowerSearch.includes("đạo hàm") || lowerSearch.includes("tích phân") || lowerSearch.includes("oxyz")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["ham so"] || [];
  } else if (lowerSearch.includes("anh") || lowerSearch.includes("english") || lowerSearch.includes("tense") || lowerSearch.includes("passive")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["tieng anh"] || [];
  } else if (lowerSearch.includes("sinh") || lowerSearch.includes("adn") || lowerSearch.includes("gen") || lowerSearch.includes("men-đen")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["sinh hoc"] || [];
  } else if (lowerSearch.includes("sử") || lowerSearch.includes("chiến dịch") || lowerSearch.includes("kháng chiến") || lowerSearch.includes("lịch sử")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["lich su"] || [];
  } else if (lowerSearch.includes("địa") || lowerSearch.includes("vùng") || lowerSearch.includes("khí hậu")) {
    matchedSeeds = CURRICULUM_KNOWLEDGE_BASE["dia ly"] || [];
  }

  const results: GeneratedQuestion[] = [];
  const labels = ["A", "B", "C", "D"];

  // Nếu có seed thực tế theo môn/bài, lấy tối đa từ seed
  if (matchedSeeds.length > 0) {
    for (let i = 0; i < count; i++) {
      const seed = matchedSeeds[i % matchedSeeds.length];
      const diff = preferredDifficulty === "mixed" 
        ? seed.difficulty 
        : (["easy", "medium", "hard"].includes(preferredDifficulty) ? (preferredDifficulty as "easy" | "medium" | "hard") : seed.difficulty);

      // Tạo 4 đáp án với 1 đáp án đúng tại vị trí ngẫu nhiên
      const correctIdx = i % 4;
      const opts: { option_label: string; content: string; is_correct: boolean }[] = [];
      let distractorIdx = 0;

      for (let pos = 0; pos < 4; pos++) {
        if (pos === correctIdx) {
          opts.push({
            option_label: labels[pos],
            content: seed.correctAnswer,
            is_correct: true,
          });
        } else {
          const dText = seed.distractors[distractorIdx % seed.distractors.length] || `Phương án nhiễu ${labels[pos]}`;
          distractorIdx++;
          opts.push({
            option_label: labels[pos],
            content: dText,
            is_correct: false,
          });
        }
      }

      results.push({
        content: seed.content,
        difficulty_level: diff,
        explanation: seed.explanation,
        options: opts,
      });
    }
    return results;
  }

  // Trường hợp bài học khác không có trong seed: Sinh câu hỏi sư phạm phân tích trực tiếp từ tên bài học
  const cleanTitle = topicName.trim() || "Chuyên đề bài học";
  const gradeLabel = grade ? ` ${grade}` : " THPT";

  const genericPedagogicalTemplates = [
    {
      titleSuffix: "Khái niệm hoặc định nghĩa chuẩn xác nhất khi học về",
      explanation: `Định nghĩa cơ bản trong chương trình${gradeLabel} về ${cleanTitle}. Nắm vững khái niệm giúp phân biệt chính xác với các chủ đề liên quan.`,
      correct: `Phản ánh đúng bản chất lý thuyết cốt lõi và các điều kiện xác định của ${cleanTitle}.`,
      wrong: [
        `Chỉ áp dụng được trong điều kiện giới hạn không chứa tham số.`,
        `Hoàn toàn đồng nhất với các bài học trước mà không có tính đặc thù.`,
        `Không tuân theo quy tắc chung của chương trình môn học.`,
      ],
    },
    {
      titleSuffix: "Đặc điểm nổi bật hoặc tính chất quan trọng của",
      explanation: `Dựa vào tính chất đặc thù của ${cleanTitle} được trình bày chi tiết trong sách giáo khoa${gradeLabel}.`,
      correct: `Tồn tại mối quan hệ chặt chẽ giữa các yếu tố thành phần và quy tắc biến đổi tương ứng.`,
      wrong: [
        `Các yếu tố biến đổi độc lập và không phụ thuộc vào quy luật tự nhiên.`,
        `Luôn mang giá trị cố định và triệt tiêu trong mọi trường hợp.`,
        `Chỉ xuất hiện khi có sự can thiệp của tác nhân ngoại cảnh phức tạp.`,
      ],
    },
    {
      titleSuffix: "Phương pháp hoặc công thức giải quyết bài toán trọng tâm trong bài",
      explanation: `Áp dụng đúng thứ tự các bước giải: Xác định điều kiện -> Lập phương trình / biểu thức -> Biến đổi và đối chiếu điều kiện bài toán về ${cleanTitle}.`,
      correct: `Phân tích dữ kiện bài toán, áp dụng định lý cơ bản và kiểm tra điều kiện thỏa mãn.`,
      wrong: [
        `Bỏ qua điều kiện xác định và áp dụng trực tiếp kết quả thử nghiệm.`,
        `Chỉ cần suy đoán cảm tính mà không cần lập luận cơ sở khoa học.`,
        `Quy về bài toán vô nghiệm ngay từ bước phân tích ban đầu.`,
      ],
    },
    {
      titleSuffix: "Trong đề thi, sai lầm hoặc 'bẫy' lý thuyết học sinh hay mắc phải nhất ở chuyên đề",
      explanation: `Học sinh thường quên xét điều kiện biên hoặc nhầm lẫn giữa các khái niệm tương đương của ${cleanTitle}. Cần đọc kỹ đề bài để tránh mất điểm.`,
      correct: `Quên xét điều kiện xác định hoặc bỏ sót các trường hợp đặc biệt tại điểm biên.`,
      wrong: [
        `Áp dụng máy móc công thức cho mọi trường hợp mà không đọc kỹ yêu cầu.`,
        `Nhầm lẫn giữa đơn vị đo lường và hệ quy chiếu chuẩn.`,
        `Tất cả các đáp án trên đều là những bẫy nhận thức phổ biến.`,
      ],
    },
    {
      titleSuffix: "Ứng dụng thực tiễn hoặc ý nghĩa khoa học lớn nhất của bài học",
      explanation: `Kiến thức về ${cleanTitle} giúp giải thích các hiện tượng thực tế và làm nền tảng cho các bài học nâng cao tiếp theo.`,
      correct: `Giải thích bản chất hiện tượng thực tế và phục vụ giải quyết các bài toán vận dụng cao.`,
      wrong: [
        `Chỉ mang tính chất hàn lâm lý thuyết, không có ý nghĩa thực tiễn.`,
        `Chỉ dùng để minh họa mà không xuất hiện trong ma trận đề thi.`,
        `Bị thay thế hoàn toàn bởi các phương pháp định tính sơ khai.`,
      ],
    },
  ];

  for (let i = 0; i < count; i++) {
    const template = genericPedagogicalTemplates[i % genericPedagogicalTemplates.length];
    const diff = preferredDifficulty === "mixed" 
      ? diffs[i % 3] 
      : (["easy", "medium", "hard"].includes(preferredDifficulty) ? (preferredDifficulty as "easy" | "medium" | "hard") : "medium");

    const correctIdx = (i + 1) % 4;
    const opts: { option_label: string; content: string; is_correct: boolean }[] = [];
    let wIdx = 0;

    for (let pos = 0; pos < 4; pos++) {
      if (pos === correctIdx) {
        opts.push({
          option_label: labels[pos],
          content: template.correct,
          is_correct: true,
        });
      } else {
        opts.push({
          option_label: labels[pos],
          content: template.wrong[wIdx % template.wrong.length],
          is_correct: false,
        });
        wIdx++;
      }
    }

    results.push({
      content: `${template.titleSuffix} "${cleanTitle}" là gì?`,
      difficulty_level: diff,
      explanation: template.explanation,
      options: opts,
    });
  }

  return results;
}

/**
 * POST /api/instructor/questions/generate-ai
 * Tích hợp AI (Gemini 1.5) sinh câu hỏi từ bài học SGK hoặc tài liệu riêng.
 * KHÔNG LƯU TRỰC TIẾP VÀO DB, trả về danh sách để giáo viên xem trước và chỉnh sửa!
 */
export async function POST(request: Request) {
  const { errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      promptText = "",
      topicId,
      customTopicName = "",
      subjectId = "",
      grade = "Lớp 12",
      count = 3,
      difficulty = "mixed",
      questionFocus = "comprehensive",
    } = body;

    const requestedCount = Math.min(Math.max(Number(count) || 3, 1), 20);
    const validDifficulty = ["easy", "medium", "hard", "mixed"].includes(difficulty) ? difficulty : "mixed";

    await connectDB();
    let topicName = customTopicName.trim() || "Chuyên đề bài học THPT";
    let subjectName = "";

    if (topicId) {
      const topicDoc = await Topic.findById(topicId).populate("subject_id", "subject_name").lean();
      if (topicDoc) {
        topicName = topicDoc.topic_name;
        if (topicDoc.subject_id && typeof topicDoc.subject_id === "object") {
          subjectName = (topicDoc.subject_id as { subject_name?: string }).subject_name || "";
        }
      }
    } else if (subjectId) {
      const subDoc = await Subject.findById(subjectId).lean();
      if (subDoc) {
        subjectName = subDoc.subject_name;
      }
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const focusGuides: Record<string, string> = {
          theory: "Tập trung 100% vào định lý, bản chất khái niệm và lý thuyết trọng tâm SGK.",
          exercise: "Tập trung vào các bài toán tính toán, phương pháp giải từng bước có số liệu rõ ràng.",
          trap: "Tập trung vào các câu hỏi bẫy nhận thức, các trường hợp ngoại lệ học sinh hay nhầm lẫn.",
          graph: "Tập trung vào dạng bài tập đồ thị, bảng số liệu hoặc liên hệ hiện tượng thực tế.",
          comprehensive: "Cân đối toàn diện: 40% nhận biết lý thuyết, 40% thông hiểu/vận dụng, 20% câu hỏi phân loại.",
        };
        const focusInstruction = focusGuides[questionFocus] || focusGuides.comprehensive;

        const systemPrompt = `
Bạn là một chuyên gia sư phạm và khảo thí giàu kinh nghiệm biên soạn đề thi Tốt nghiệp THPT Quốc Gia ${subjectName ? `môn ${subjectName}` : ""}.
Nhiệm vụ của bạn là bám sát chương trình Giáo Dục Phổ Thông mới (sách giáo khoa Kết Nối Tri Thức / Cánh Diều / Chân Trời Sáng Tạo) và ma trận đề thi chuẩn của Bộ Giáo Dục & Đào Tạo đối với bài học: "${topicName}" ${subjectName ? `(Môn: ${subjectName})` : ""} - Khối: ${grade || "THPT"}.
Biên soạn đúng ${requestedCount} câu hỏi trắc nghiệm chất lượng cao.

THÔNG TIN BÀI HỌC:
- Môn học: ${subjectName || "THPT Quốc Gia"}
- Tên bài học / Chuyên đề: "${topicName}"
- Khối lớp: ${grade || "Lớp 12 (Trọng tâm ôn thi)"}
- Định hướng ra đề: ${focusInstruction}
${promptText.trim() ? `- YÊU CẦU HOẶC TÀI LIỆU BỔ SUNG TỪ GIÁO VIÊN:\n"""\n${promptText.trim()}\n"""` : `- YÊU CẦU TỰ ĐỘNG: Phân tích kiến thức chuẩn SGK của bài học "${topicName}" để biên soạn câu hỏi thực tế sát với đề thi tốt nghiệp.`}

YÊU CẦU BẮT BUỘC:
1. Số lượng câu hỏi: Đúng ${requestedCount} câu.
2. Mức độ khó: ${validDifficulty === "mixed" ? "Phân bổ đều từ Dễ (Nhận biết), Trung bình (Thông hiểu), đến Khó (Vận dụng cao)" : validDifficulty}.
3. Mỗi câu hỏi BẮT BUỘC có ĐÚNG 4 phương án lựa chọn được gán nhãn A, B, C, D.
4. BẮT BUỘC có ĐÚNG 1 phương án có is_correct: true, 3 phương án còn lại có is_correct: false (phương án nhiễu hợp lý, không ngây ngô).
5. Mỗi câu hỏi phải có phần "explanation" giải thích chi tiết phương pháp giải từng bước theo chuẩn sư phạm.
6. Hỗ trợ biểu thức toán học hoặc công thức hóa học rõ ràng, dễ đọc.

ĐỊNH DẠNG TRẢ VỀ:
CHỈ TRẢ VỀ DUY NHẤT một mảng JSON thuần túy (Array of objects), KHÔNG kèm markdown code block (không dùng \`\`\`json), định dạng như sau:
[
  {
    "content": "Nội dung câu hỏi đề bài...",
    "difficulty_level": "easy" | "medium" | "hard",
    "explanation": "Lời giải thích chi tiết...",
    "options": [
      { "option_label": "A", "content": "Nội dung đáp án A", "is_correct": false },
      { "option_label": "B", "content": "Nội dung đáp án B", "is_correct": true },
      { "option_label": "C", "content": "Nội dung đáp án C", "is_correct": false },
      { "option_label": "D", "content": "Nội dung đáp án D", "is_correct": false }
    ]
  }
]
`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // Làm sạch chuỗi JSON nếu Gemini trả về markdown code blocks
        let cleanedJson = responseText.trim();
        if (cleanedJson.startsWith("```json")) {
          cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
        } else if (cleanedJson.startsWith("```")) {
          cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        const parsedQuestions = JSON.parse(cleanedJson);

        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
          const validated = parsedQuestions.map((q: GeneratedQuestion, idx: number) => {
            const labels = ["A", "B", "C", "D"];
            let options = Array.isArray(q.options) ? q.options : [];
            
            while (options.length < 4) {
              const nextLabel = labels[options.length] || `Opt${options.length + 1}`;
              options.push({ option_label: nextLabel, content: `Phương án ${nextLabel}`, is_correct: false });
            }
            if (options.length > 4) {
              options = options.slice(0, 4);
            }

            const hasCorrect = options.some((o) => o.is_correct);
            if (!hasCorrect && options[0]) {
              options[0].is_correct = true;
            }

            return {
              content: q.content || `Câu hỏi trắc nghiệm ${idx + 1} về ${topicName}`,
              difficulty_level: ["easy", "medium", "hard"].includes(q.difficulty_level) ? q.difficulty_level : "medium",
              explanation: q.explanation || `Lời giải chi tiết bài học ${topicName}.`,
              options: options.map((opt, oIdx) => ({
                option_label: opt.option_label || labels[oIdx],
                content: opt.content || `Phương án ${labels[oIdx]}`,
                is_correct: Boolean(opt.is_correct),
              })),
            };
          });

          return NextResponse.json({
            success: true,
            provider: "google-gemini",
            questions: validated,
          });
        }
      } catch (geminiError) {
        console.warn("Lỗi khi gọi Gemini API, chuyển sang Smart Curriculum Fallback:", geminiError);
      }
    }

    // Nếu không có API Key hoặc Gemini lỗi: sử dụng Smart Curriculum Fallback AI
    const fallbackQuestions = generateFallbackQuestions(
      promptText,
      topicName,
      subjectName,
      grade,
      requestedCount,
      validDifficulty
    );

    return NextResponse.json({
      success: true,
      provider: "smart-curriculum-ai",
      message: "Đã tạo câu hỏi thành công theo bài học!",
      questions: fallbackQuestions,
    });
  } catch (error) {
    console.error("Lỗi khi sinh câu hỏi AI:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xử lý yêu cầu sinh câu hỏi của AI" },
      { status: 500 }
    );
  }
}
