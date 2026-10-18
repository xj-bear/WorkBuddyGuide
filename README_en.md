<p align="center">
  <a href="https://workbuddy.5678.fun/">
    <img src="./docs/public/og/workbuddy-guide.png" alt="Homepage screenshot of the WorkBuddy field guide maintained by xj-bear" width="100%">
  </a>
</p>

<h1 align="center">xj-bear's WorkBuddy Field Guide</h1>

<p align="center"><strong>Put WorkBuddy to work on real tasks</strong></p>

<p align="center">
  English · <a href="./README.md">简体中文</a> ·
  <a href="https://workbuddy.5678.fun/">Read Online</a> ·
  <a href="./docs/reading-guide.md">Reading Guide</a> ·
  <a href="./CONTRIBUTING_en.md">Contribute</a>
</p>

> I'm xj-bear. This guide documents how I use WorkBuddy for real tasks—from getting started and everyday work to reusable Skills, automation, and agent collaboration.

## Read Online

The recommended reading experience is **[workbuddy.5678.fun](https://workbuddy.5678.fun/)**. The website provides full navigation, local search, page outlines, dark mode, rendered diagrams, and mobile support.

The book is currently written primarily in Simplified Chinese. English contributions and translation proposals are welcome.

## What Is Inside

| Section | Topics |
| --- | --- |
| Part I · User Manual | Installation, interface, first task, Skills, connectors, APIs, and automation |
| Part II · Cases | Office work, files, remote control, news, knowledge, meetings, investing, video, content, and GEO |
| Part III · Advanced | Building Skills, multi-agent system design, and reliable automation |
| Part IV · Roles and Industries | Role-based learning paths and industry workflows |
| Appendices | Reusable instructions and a scenario lookup table |

## How to Read

- **New to WorkBuddy**: start with Chapter 1 and complete Part I in order.
- **Have a specific task**: jump to a matching case in Part II, then use Part III to turn the result into a reusable system.
- **Rolling out to a team**: focus on Parts III and IV, including permissions, acceptance criteria, and failure recovery.

## Local Development

Node.js 20–24 is supported; Node.js 22 is recommended.

```bash
npm install
npm run dev
```

Build and preview the static site:

```bash
npm run docs:build
npm run docs:preview
```

## Contributing

Contributions are welcome, including:

- corrections for typos, broken links, and outdated information;
- reproducible real-world WorkBuddy cases;
- Skills, connectors, API, and automation practices;
- role-specific and industry-specific workflows;
- improvements to navigation, search, design, and accessibility;
- English translations.

Read the [Contribution Guide](./CONTRIBUTING_en.md) or open an [Issue](https://github.com/AlephAITech/WorkBuddyGuide/issues).

## Deployment

The site uses **VitePress + Cloudflare Pages + GitHub**. Cloudflare Pages builds and deploys the `main` branch automatically. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact settings.

## Project Maintainer

This project is maintained and updated by **[xj-bear](https://github.com/xj-bear)**. It uses the upstream MIT License; original copyright notices are preserved in [LICENSE](./LICENSE).

## Disclaimer

This is a community-maintained WorkBuddy practice guide. For time-sensitive product details—including features, UI, pricing, availability, and security policies—refer to official WorkBuddy sources.

## License

This project is licensed under the [MIT License](./LICENSE). You may use, copy, modify, and distribute it, provided that the original copyright notice and license text are retained.
