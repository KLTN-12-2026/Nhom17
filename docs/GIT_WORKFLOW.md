# Git Workflow cho nhom

Tai lieu nay huong dan cach lam viec voi Git/GitHub cho du an `ai-quiz-app`.

## Nguyen tac chinh

- Khong code truc tiep tren nhanh `main` khi lam nhom.
- Moi task hoac tinh nang nen co mot branch rieng.
- Moi branch nen mo Pull Request vao `main`.
- Chi merge khi CI chay thanh cong.
- Truoc khi tao branch moi, luon cap nhat `main`.

## 1. Cap nhat code moi nhat

Truoc khi bat dau lam task:

```bash
git checkout main
git pull origin main
```

## 2. Tao branch moi

Dat ten branch theo muc dich cong viec:

```text
feature/auth
feature/quiz-crud
feature/ai-generate-quiz
fix/login-error
docs/update-readme
chore/setup-ci
```

Tao branch:

```bash
git checkout -b feature/auth
```

## 3. Lam code va commit

Kiem tra file da thay doi:

```bash
git status
```

Them file vao commit:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: add auth pages"
```

## 4. Push branch len GitHub

Lan dau push branch moi:

```bash
git push -u origin feature/auth
```

Nhung lan sau tren cung branch:

```bash
git push
```

## 5. Mo Pull Request

Len GitHub repo `ai-quiz-app`:

```text
Pull requests -> New pull request
base: main
compare: feature/auth
Create pull request
```

Trong Pull Request nen ghi:

- Task nay lam gi.
- Man hinh/API nao bi anh huong.
- Cach test.
- Anh chup man hinh neu co UI.

## 6. Cho CI chay

CI se tu dong chay khi:

- Push len `main`.
- Mo Pull Request vao `main`.
- Push them commit vao Pull Request.

CI hien tai chay:

```bash
npm ci
npm run lint
npm run build
```

Neu CI do, can sua loi tren branch cua minh roi push lai.

## 7. Merge vao main

Chi merge khi:

- Code da duoc review.
- CI da xanh.
- Khong con conflict.

Sau khi merge Pull Request, quay ve may local:

```bash
git checkout main
git pull origin main
```

Co the xoa branch local da merge:

```bash
git branch -d feature/auth
```

## 8. Quy uoc commit message

Nen dung format ngan gon:

```text
feat: them tinh nang moi
fix: sua loi
docs: sua tai lieu
style: sua format/code style
refactor: sua code nhung khong doi behavior
test: them/sua test
chore: viec cau hinh, dependency, CI
```

Vi du:

```bash
git commit -m "feat: add quiz creation form"
git commit -m "fix: handle empty AI response"
git commit -m "docs: add git workflow guide"
git commit -m "chore: add ci workflow"
```

## 9. Xu ly conflict co ban

Neu Pull Request bi conflict:

```bash
git checkout feature/auth
git pull origin main
```

Sua cac file conflict trong VS Code, sau do:

```bash
git add .
git commit -m "fix: resolve merge conflict"
git push
```

## 10. Quy trinh de xuat cho nhom

1. Lay task tu leader hoac task board.
2. Cap nhat `main`.
3. Tao branch moi.
4. Lam code.
5. Chay local:

```bash
npm run lint
npm run build
npm run dev
```

6. Commit va push branch.
7. Mo Pull Request.
8. Cho CI xanh va review.
9. Merge vao `main`.
10. Cap nhat lai `main` tren may.

