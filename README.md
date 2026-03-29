# Boggle.WEB

A premium word-finding game built with Next.js, TypeScript, and Supabase. Challenge yourself to find as many words as possible in 3 minutes on a 4x4 grid using the official Scrabble dictionary (CSW24). Check out the official webapp here:
(Vercel Link)

![Boggle.WEB Screenshot](https://via.placeholder.com/800x400?text=Boggle+Screenshot)

## Features

- **Premium Design**: Elegant "Intellectual Play" aesthetic with cream/parchment colors and serif typography
- **Prominent Scoring**: Hero-style score display with real-time visual feedback
- **User Authentication**: Username/password system with persistent game history
- **Smart Game Engine**: Trie-based solver with 280,000+ word CSW24 dictionary
- **Fully Responsive**: Beautiful on desktop, tablet, and mobile
- **Blazing Fast**: Optimized dictionary loading and instant word validation
- **Coming Soon**: Daily challenges, leaderboards, and multiplayer mode

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works fine but upping email rate limits through a provider is highly recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jeromeoe/boggle-NYT.git
   cd boggle-NYT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   a. Create a new project at [supabase.com](https://supabase.com)
   
   b. Run the SQL migrations in order:
      - Go to SQL Editor in Supabase dashboard
      - Copy and execute `sql/01_users_schema.sql`
      - Then `sql/02_rls_policies.sql`
      - Finally `sql/03_functions.sql`

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## How to Play

1. **Start a Game**: Click "Start New Game" to generate a random 4x4 board
2. **Find Words**: Click tiles or type letters to form words (minimum 3 letters)
3. **Submit**: Press Enter or click Submit
4. **Score Points**: 
   - Valid words = positive points (longer words = more points)
   - Invalid words = Scaling Penalty 
   - Duplicates = ignored
5. **Beat the Clock**: You have 3 minutes to find as many words as possible!

### Scoring System

| Word Length | Points |
|------------|--------|
| 3 letters  | 1      |
| 4 letters  | 1      |
| 5 letters  | 2      |
| 6 letters  | 3      |
| 7 letters  | 5      |
| 8+ letters | 11     |


## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Auth**: Custom username/password with bcrypt
- **Dictionary**: CSW24 (280k+ words)

## Design Philosophy

- **Typography**: Fraunces (serif) for headers, Geist Sans for UI
- **Colors**: Cream (#F9F7F1), Forest Green (#1A3C34), Gold (#D4AF37)
- **Motion**: Framer Motion for smooth animations 
- **Accessibility**: Full keyboard navigation and screen reader support

## Security

- Row Level Security (RLS) enabled on all database tables
- Passwords hashed with bcrypt (10 rounds)
- Environment variables for sensitive credentials
- Input validation on client and server

## License

MIT License - feel free to use this project for learning or building your own word game!

##  Acknowledgments

- CSW24 dictionary from [NASPA](https://www.scrabbleplayers.org/)
- Inspired by NYT Games and classic Boggle
- Built using [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)

## Found a Bug?

Please open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Roadmap

- [x] Daily Challenge mode (same board for all players)
- [ ] Global leaderboards
- [ ] Statistics dashboard
- [ ] Social sharing
- [ ] Multiplayer lobbies
- [ ] Mobile app (React Native)

---

**Enjoy playing Boggle!** 
