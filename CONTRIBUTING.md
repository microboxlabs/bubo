# Contributing to Bubo

We're excited that you're interested in contributing to Bubo! 🎉

Bubo is an open-source AI coding agent that automates software development workflows through deep GitHub integration. Whether you're passionate about AI, automation, developer tools, or just want to help build something cool, we'd love to have you on board.

## Why Contribute?

- **Shape the future of AI-assisted development**: Help build tools that make developers more productive
- **Learn and grow**: Work with modern TypeScript, GitHub APIs, and AI integration patterns
- **Build your portfolio**: Contribute to a production-ready project with real-world impact
- **Join a community**: Connect with developers who care about automation and developer experience

## How You Can Help

### 🐛 Bug Reports
Found a bug? Please [open an issue](https://github.com/microboxlabs/bubo/issues/new) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)

### 💡 Feature Ideas
Have an idea to make Bubo better? We'd love to hear it! Open an issue with:
- What problem it solves
- How you envision it working
- Any examples or mockups

### 🔧 Code Contributions
Ready to write code? Here's how to get started:

1. **Fork the repository** and clone your fork
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Set up development environment**:
   ```bash
   pnpm install
   pnpm build
   ```
4. **Make your changes** following our [coding standards](#coding-standards)
5. **Test your changes**: `pnpm test && pnpm lint && pnpm typecheck`
6. **Commit with clear messages**: See our [commit conventions](#commit-conventions)
7. **Push and open a Pull Request**

### 📖 Documentation
Great documentation makes projects accessible. Help us improve:
- README clarity and examples
- Code comments and JSDoc
- Tutorials and guides
- API documentation

### 🧪 Testing
Help us improve test coverage:
- Write tests for new features
- Add edge case tests
- Improve existing test suites

### 🎨 Design & UX
If you have design skills, we'd love help with:
- CLI output formatting
- Error messages and user feedback
- Configuration file examples
- Visual diagrams and documentation

## Coding Standards

- **TypeScript**: Strict mode, no `any` types
- **ESM modules**: Modern Node.js syntax
- **Testing**: All new features need tests
- **Linting**: Code must pass `pnpm lint`
- **Type checking**: Must pass `pnpm typecheck`
- **Formatting**: Use Prettier (runs automatically)

See [AGENTS.md](./AGENTS.md) for detailed conventions and project structure.

## Commit Conventions

We follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example: `feat: add support for custom branch prefixes`

## Getting Help

- **Questions?** Open a [discussion](https://github.com/microboxlabs/bubo/discussions)
- **Found a bug?** [Open an issue](https://github.com/microboxlabs/bubo/issues/new)
- **Want to chat?** Check out our discussions section

## Code of Conduct

We're committed to providing a welcoming and inclusive environment. Please be respectful, constructive, and kind in all interactions.

## Recognition

Contributors will be:
- Listed in our contributors section (if you'd like)
- Credited in release notes for significant contributions
- Appreciated by the entire community! 🙏

## First Contribution?

No problem! Look for issues labeled `good first issue` or `help wanted`. These are great starting points. Don't hesitate to ask questions—we're here to help!

---

Thank you for considering contributing to Bubo. Every contribution, no matter how small, makes a difference! 🚀
