import * as XLSX from "xlsx";
import mammoth from "mammoth";

export interface ParsedOption {
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  id: string;
  selected: boolean;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation: string;
  options: ParsedOption[];
  isValid: boolean;
  errors: string[];
}

/**
 * Trích xuất văn bản từ file Word (.docx)
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (err) {
    console.error("Lỗi trích xuất docx:", err);
    throw new Error("Không thể đọc tệp Word (.docx). Vui lòng thử lưu lại file hoặc copy văn bản trực tiếp.");
  }
}

/**
 * Tự động nhận diện mức độ khó dựa trên từ khóa khảo thí Bloom và cấu trúc câu hỏi
 */
export function detectDifficultyFromContent(content: string): "easy" | "medium" | "hard" {
  if (!content) return "medium";
  const lower = content.toLowerCase();

  // Nhận biết / Dễ: định nghĩa, hỏi tên, công thức gốc, nhận diện chất/hiện tượng 1 bước
  if (
    lower.includes("chất nào sau đây") ||
    lower.includes("công thức nào") ||
    lower.includes("định nghĩa") ||
    lower.includes("khái niệm") ||
    lower.includes("đơn vị của") ||
    lower.includes("ký hiệu") ||
    lower.includes("phát biểu nào sau đây là đúng") ||
    lower.includes("phát biểu nào sau đây là sai") ||
    lower.includes("tên gọi của") ||
    lower.includes("đặc điểm nào") ||
    lower.includes("kim loại nào") ||
    lower.includes("hợp chất nào")
  ) {
    return "easy";
  }

  // Vận dụng cao / Khó: tham số m, cực trị, đồ thị, bài toán thực tiễn phức tạp
  if (
    lower.includes("đồ thị") ||
    lower.includes("tham số m") ||
    lower.includes("tổng hợp") ||
    lower.includes("bài toán thực tế") ||
    lower.includes("cực trị") ||
    lower.includes("giá trị lớn nhất") ||
    lower.includes("giá trị nhỏ nhất") ||
    lower.includes("hỗn hợp x gồm") ||
    lower.includes("phân loại") ||
    lower.includes("khoảng cách từ") ||
    lower.includes("vận dụng cao")
  ) {
    return "hard";
  }

  return "medium";
}

/**
 * Phân tích cú pháp câu hỏi trắc nghiệm từ văn bản chuẩn của giáo viên THPT
 * Hỗ trợ định dạng:
 * Câu 1: <Đề bài>
 * A. <Đáp án A>
 * *B. <Đáp án B đúng>
 * C. <Đáp án C>
 * D. <Đáp án D>
 * [Đáp án]: B (hoặc dấu * ở đầu phương án)
 * [Lời giải]: <Giải thích>
 * [Độ khó]: Dễ | Trung bình | Khó
 */
export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const parsedList: ParsedQuestion[] = [];

  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: ParsedOption[] = [];
  let explicitAnswerLabel: string | null = null;

  // Regex nhận diện bắt đầu một câu hỏi mới:
  // "Câu 1:", "Câu 1.", "Bài 1:", "1.", "1/ ", "1:"
  const questionStartRegex = /^(?:câu|bài|\d+)[\s.:/)]+/i;
  // Regex nhận diện phương án A, B, C, D (có thể có dấu * ở đầu chỉ đáp án đúng)
  const optionRegex = /^([*•]?)\s*([A-D])[\s.:/)]+\s*(.*)$/i;
  // Regex nhận diện dòng Đáp án đúng riêng biệt: "Đáp án: A", "Đ/a: B", "Key: C"
  const answerRegex = /^(?:đáp\s*án|đ\/a|key|ans|answer)[\s:]*([A-D])/i;
  // Regex nhận diện Lời giải: "Lời giải:", "Giải thích:", "HDG:"
  const explanationRegex = /^(?:lời\s*giải|giải\s*thích|hdg|hướng\s*dẫn\s*giải)[\s:]*(.*)$/i;
  // Regex nhận diện Độ khó: "Độ khó: Dễ", "Mức độ: Thông hiểu"
  const difficultyRegex = /^(?:độ\s*khó|mức\s*độ|level)[\s:]*(.*)$/i;

  function finalizeCurrentQuestion() {
    if (!currentQuestion || !currentQuestion.content) return;

    const errors: string[] = [];
    const labels = ["A", "B", "C", "D"];

    // Đảm bảo đủ 4 phương án
    const finalOptions: ParsedOption[] = labels.map((lbl) => {
      const found = currentOptions.find((o) => o.option_label.toUpperCase() === lbl);
      if (found) {
        return {
          ...found,
          is_correct:
            found.is_correct ||
            (explicitAnswerLabel ? explicitAnswerLabel.toUpperCase() === lbl : false),
        };
      }
      return {
        option_label: lbl,
        content: "",
        is_correct: explicitAnswerLabel ? explicitAnswerLabel.toUpperCase() === lbl : false,
      };
    });

    if (finalOptions.filter((o) => o.content.trim()).length < 2) {
      errors.push("Câu hỏi phải có ít nhất 2 phương án lựa chọn.");
    }

    const hasCorrect = finalOptions.some((o) => o.is_correct);
    if (!hasCorrect) {
      errors.push("Chưa đánh dấu đáp án đúng (dùng dấu * trước đáp án hoặc dòng 'Đáp án: [A-D]').");
    }

    const resolvedDifficulty =
      currentQuestion.difficulty_level || detectDifficultyFromContent(currentQuestion.content);

    parsedList.push({
      id: `parsed-txt-${Date.now()}-${parsedList.length}`,
      selected: errors.length === 0,
      content: currentQuestion.content,
      difficulty_level: resolvedDifficulty,
      explanation: currentQuestion.explanation || "",
      options: finalOptions,
      isValid: errors.length === 0,
      errors,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // 1. Kiểm tra dòng Đáp án
    const ansMatch = line.match(answerRegex);
    if (ansMatch && currentQuestion) {
      explicitAnswerLabel = ansMatch[1].toUpperCase();
      continue;
    }

    // 2. Kiểm tra dòng Lời giải
    const expMatch = line.match(explanationRegex);
    if (expMatch && currentQuestion) {
      currentQuestion.explanation = expMatch[1] || "";
      continue;
    }

    // 3. Kiểm tra dòng Độ khó
    const diffMatch = line.match(difficultyRegex);
    if (diffMatch && currentQuestion) {
      const diffRaw = (diffMatch[1] || "").toLowerCase();
      if (diffRaw.includes("dễ") || diffRaw.includes("nhận biết") || diffRaw.includes("easy")) {
        currentQuestion.difficulty_level = "easy";
      } else if (diffRaw.includes("khó") || diffRaw.includes("vận dụng") || diffRaw.includes("hard")) {
        currentQuestion.difficulty_level = "hard";
      } else {
        currentQuestion.difficulty_level = "medium";
      }
      continue;
    }

    // 4. Kiểm tra phương án lựa chọn A, B, C, D
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      const isStar = Boolean(optMatch[1] && optMatch[1] === "*");
      const label = optMatch[2].toUpperCase();
      const content = optMatch[3].trim();

      currentOptions.push({
        option_label: label,
        content: content,
        is_correct: isStar,
      });
      continue;
    }

    // 5. Kiểm tra bắt đầu câu hỏi mới
    const isNewQuestion =
      questionStartRegex.test(line) &&
      !line.match(optionRegex) &&
      !line.match(answerRegex) &&
      !line.match(explanationRegex);

    if (isNewQuestion) {
      finalizeCurrentQuestion();
      currentQuestion = {
        content: line.replace(/^(?:câu|bài|\d+)[\s.:/)]+/i, "").trim() || line,
        difficulty_level: "medium",
        explanation: "",
      };
      currentOptions = [];
      explicitAnswerLabel = null;
      continue;
    }

    // 6. Nếu là dòng văn bản tiếp nối nội dung câu hỏi
    if (currentQuestion && currentOptions.length === 0) {
      currentQuestion.content = `${currentQuestion.content}\n${line}`;
    }
  }

  // Kết thúc duyệt, lưu câu cuối cùng
  finalizeCurrentQuestion();

  return parsedList;
}

/**
 * Phân tích cú pháp câu hỏi từ file Excel (.xlsx / .csv)
 */
export function parseQuestionsFromExcel(buffer: ArrayBuffer): ParsedQuestion[] {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    // Chuyển sheet thành danh sách JSON
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    const parsedList: ParsedQuestion[] = [];

    rows.forEach((row, idx) => {
      // Tìm các cột tương ứng (linh hoạt tên cột tiếng Việt hoặc tiếng Anh)
      const content = String(
        row["Câu hỏi"] ||
          row["Nội dung câu hỏi"] ||
          row["Content"] ||
          row["Question"] ||
          row["content"] ||
          row["question"] ||
          ""
      ).trim();

      if (!content) return;

      const optA = String(row["A"] || row["Đáp án A"] || row["Option A"] || row["a"] || "").trim();
      const optB = String(row["B"] || row["Đáp án B"] || row["Option B"] || row["b"] || "").trim();
      const optC = String(row["C"] || row["Đáp án C"] || row["Option C"] || row["c"] || "").trim();
      const optD = String(row["D"] || row["Đáp án D"] || row["Option D"] || row["d"] || "").trim();

      const correctRaw = String(
        row["Đáp án đúng"] ||
          row["Đ/a"] ||
          row["Correct"] ||
          row["Answer"] ||
          row["Key"] ||
          row["correct"] ||
          ""
      )
        .trim()
        .toUpperCase();

      const explanation = String(
        row["Lời giải"] ||
          row["Giải thích"] ||
          row["Explanation"] ||
          row["explanation"] ||
          ""
      ).trim();

      const diffRaw = String(
        row["Độ khó"] || row["Mức độ"] || row["Difficulty"] || row["difficulty"] || ""
      )
        .trim()
        .toLowerCase();

      let diff: "easy" | "medium" | "hard" = "medium";
      if (diffRaw.includes("dễ") || diffRaw.includes("nhận biết") || diffRaw.includes("easy")) {
        diff = "easy";
      } else if (diffRaw.includes("khó") || diffRaw.includes("vận dụng") || diffRaw.includes("hard")) {
        diff = "hard";
      } else if (diffRaw) {
        diff = "medium";
      } else {
        diff = detectDifficultyFromContent(content);
      }

      const options: ParsedOption[] = [
        { option_label: "A", content: optA, is_correct: correctRaw === "A" },
        { option_label: "B", content: optB, is_correct: correctRaw === "B" },
        { option_label: "C", content: optC, is_correct: correctRaw === "C" },
        { option_label: "D", content: optD, is_correct: correctRaw === "D" },
      ];

      const errors: string[] = [];
      if (!optA || !optB || !optC || !optD) {
        errors.push("Chưa đủ 4 phương án A, B, C, D");
      }
      if (!options.some((o) => o.is_correct)) {
        errors.push("Cột 'Đáp án đúng' phải là một trong các chữ cái: A, B, C, D");
      }

      parsedList.push({
        id: `parsed-excel-${Date.now()}-${idx}`,
        selected: errors.length === 0,
        content,
        difficulty_level: diff,
        explanation,
        options,
        isValid: errors.length === 0,
        errors,
      });
    });

    return parsedList;
  } catch (err) {
    console.error("Lỗi đọc file Excel:", err);
    throw new Error("Không thể phân tích dữ liệu từ file Excel. Vui lòng kiểm tra lại cấu trúc file mẫu.");
  }
}

/**
 * Sinh file mẫu định dạng Text (.txt) chuẩn
 */
export function generateTextTemplate(): string {
  return `Câu 1: Hàm số y = x^3 - 3x^2 + 2 đạt cực đại tại điểm nào?
A. x = 0
B. x = 2
*C. x = 1
D. x = -1
[Đáp án]: A
[Lời giải]: Ta có y' = 3x^2 - 6x = 0 <=> x = 0 hoặc x = 2. Dấu y' đổi từ dương sang âm qua x = 0 nên đạt cực đại tại x = 0.
[Độ khó]: Thông hiểu

Câu 2: Cho tích phân I = int_0^1 (2x + 1) dx. Giá trị của I bằng:
*A. 2
B. 1
C. 3
D. 4
[Lời giải]: I = [x^2 + x]_0^1 = (1 + 1) - 0 = 2.
[Độ khó]: Dễ

Câu 3: Trong không gian Oxyz, mặt phẳng (P): 2x - y + 2z - 4 = 0 có một vectơ pháp tuyến là:
A. n = (2; 1; 2)
*B. n = (2; -1; 2)
C. n = (2; -1; -4)
D. n = (-1; 2; -4)
[Lời giải]: Vectơ pháp tuyến được xác định bởi các hệ số của x, y, z: n = (2; -1; 2).
[Độ khó]: Dễ
`;
}

/**
 * Sinh file mẫu định dạng Excel (.xlsx) chuẩn
 */
export function generateExcelTemplateBlob(): Blob {
  const sampleData = [
    {
      "Câu hỏi": "Hàm số y = x^4 - 2x^2 + 1 có bao nhiêu điểm cực trị?",
      "Đáp án A": "1 điểm",
      "Đáp án B": "2 điểm",
      "Đáp án C": "3 điểm",
      "Đáp án D": "4 điểm",
      "Đáp án đúng": "C",
      "Độ khó": "Thông hiểu",
      "Lời giải": "y' = 4x^3 - 4x = 0 <=> x = 0 hoặc x = +-1 (3 nghiệm đơn phân biệt nên có 3 điểm cực trị).",
    },
    {
      "Câu hỏi": "Số nghiệm thực của phương trình 2^(x^2 - 1) = 8 là:",
      "Đáp án A": "0",
      "Đáp án B": "1",
      "Đáp án C": "2",
      "Đáp án D": "3",
      "Đáp án đúng": "C",
      "Độ khó": "Dễ",
      "Lời giải": "2^(x^2 - 1) = 2^3 <=> x^2 - 1 = 3 <=> x^2 = 4 <=> x = +-2 (có 2 nghiệm thực).",
    },
    {
      "Câu hỏi": "Khối chóp có diện tích đáy B = 6a^2 và chiều cao h = 2a có thể tích là:",
      "Đáp án A": "12a^3",
      "Đáp án B": "4a^3",
      "Đáp án C": "6a^3",
      "Đáp án D": "2a^3",
      "Đáp án đúng": "B",
      "Độ khó": "Dễ",
      "Lời giải": "V = 1/3 * B * h = 1/3 * 6a^2 * 2a = 4a^3.",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Định dạng độ rộng cột
  worksheet["!cols"] = [
    { wch: 50 }, // Câu hỏi
    { wch: 20 }, // A
    { wch: 20 }, // B
    { wch: 20 }, // C
    { wch: 20 }, // D
    { wch: 15 }, // Đáp án đúng
    { wch: 15 }, // Độ khó
    { wch: 60 }, // Lời giải
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "NganHangCauHoi");

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
