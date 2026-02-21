# Contributing to Drop The Tabs

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/drop-the-tabs.git`
3. Install dependencies: `bun install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## 📋 Development Setup

```bash
# Start development server
bun run dev

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select .output/chrome-mv3-dev/
```

## 🎯 Types of Contributions

### 🐛 Bug Reports

- Use the [Bug Report template](https://github.com/yourusername/drop-the-tabs/issues/new?template=bug_report.md)
- Include steps to reproduce
- Include Chrome version and OS
- Include screenshots if applicable

### 💡 Feature Requests

- Use the [Feature Request template](https://github.com/yourusername/drop-the-tabs/issues/new?template=feature_request.md)
- Describe the problem you're trying to solve
- Describe your proposed solution
- Consider alternatives

### 📝 Code Contributions

#### Style Guide

- **TypeScript**: Use strict mode
- **React**: Functional components with hooks
- **CSS**: Tailwind CSS utilities
- **Naming**: camelCase for variables/functions, PascalCase for components

#### Commit Messages

```
feat: Add new tab grouping feature
fix: Resolve deduplication edge case
docs: Update README with new screenshots
refactor: Simplify stats collector
test: Add tests for tab manager
```

#### Pull Request Process

1. Ensure your code passes type checking: `bun run compile`
2. Update documentation if needed
3. Add a descriptive PR title and description
4. Link related issues
5. Wait for review

## 🏗️ Architecture Guidelines

### Adding New Features

1. **Types First** — Define types in `src/utils/types.ts`
2. **Logic Layer** — Implement in appropriate utility file
3. **UI Layer** — Add to `src/components/Popup.tsx` or create new component
4. **Background** — Add message handler if needed
5. **Documentation** — Update README.md

### Code Organization

```
src/
├── entrypoints/     # Extension entry points
├── components/      # React components
├── utils/          # Business logic
└── assets/         # Static files
```

## 🧪 Testing

Currently, we rely on manual testing:

1. Test in Chrome (primary target)
2. Test with various numbers of tabs
3. Test with different websites
4. Verify data persistence

Future: We plan to add automated testing with Playwright.

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for complex functions
- Update this file for contributor-facing changes

## 🎨 Design Guidelines

- Use Base UI components for consistency
- Follow Tailwind's color palette
- Support dark mode (use `dark:` variants)
- Ensure keyboard accessibility
- Test with 200%+ zoom

## 🤝 Code Review

All PRs require review before merging. Reviewers will check:

- [ ] Code quality and style
- [ ] Feature works as described
- [ ] No breaking changes (or properly documented)
- [ ] Documentation updated

## 📞 Questions?

- Join our [Discord](https://discord.gg/...) (coming soon)
- Open a [Discussion](https://github.com/yourusername/drop-the-tabs/discussions)

## 🙏 Thank You!

Every contribution, no matter how small, helps make Drop The Tabs better for everyone.
