# POD AI Studio

A premium all-in-one Print on Demand design suite.

## Deployment Instructions

### 1. GitHub Setup
- Initialize a git repository: `git init`
- Add files: `git add .`
- Commit: `git commit -m "Initial commit"`
- Create a new repository on GitHub.
- Push your code:
  ```bash
  git remote add origin <your-repo-url>
  git branch -M main
  git push -u origin main
  ```

### 2. Vercel Deployment
- Log in to [Vercel](https://vercel.com).
- Click **"Add New"** > **"Project"**.
- Import your GitHub repository.
- **Environment Variables**:
  - In the "Environment Variables" section, add:
    - `API_KEY`: Your Google Gemini API Key.
- Click **"Deploy"**.

### 3. Usage
- Access your live URL provided by Vercel.
- The app will use the `API_KEY` configured in the Vercel dashboard.
