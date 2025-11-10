# Contributing to Email Copilot

Thank you for your interest in contributing to Email Copilot! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/MyAIssistant.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Follow the setup guide in [SETUP.md](./SETUP.md)

## Development Workflow

### Before Making Changes

1. Make sure you're on the latest main branch:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Making Changes

1. Write clean, documented code
2. Follow the existing code style
3. Add tests if applicable
4. Update documentation as needed

### Code Style

- Use TypeScript for all new code
- Follow Prettier formatting (run `npm run format`)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add email search functionality
fix: Resolve token refresh issue
docs: Update setup instructions
refactor: Simplify email sync logic
```

Prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Testing

Before submitting a pull request:

1. Build all packages:
   ```bash
   npm run build
   ```

2. Run linting:
   ```bash
   npm run lint
   ```

3. Test your changes manually:
   - Start all services
   - Test the feature end-to-end
   - Check for console errors

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a pull request on GitHub
3. Fill out the PR template with:
   - Description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Testing done

4. Wait for review
5. Address feedback if needed
6. Once approved, your PR will be merged!

## Project Structure

```
MyAIssistant/
├── packages/
│   ├── shared/      # Shared TypeScript types
│   ├── server/      # Express API backend
│   ├── worker/      # Background job workers
│   └── web/         # React frontend
├── SETUP.md         # Setup instructions
├── ARCHITECTURE.md  # System architecture
└── README.md        # Main documentation
```

## Areas for Contribution

### High Priority
- Bug fixes
- Performance improvements
- Documentation improvements
- Security enhancements

### Features
- Additional email providers (Yahoo, iCloud, etc.)
- Email search functionality
- Advanced filtering
- Email templates
- Calendar integration
- Mobile app

### AI Enhancements
- Custom AI prompts
- Multi-language support
- Sentiment analysis improvements
- Priority inbox
- Smart categorization

## Code Review Process

All contributions go through code review:

1. Maintainer reviews the PR
2. Feedback is provided
3. Author addresses feedback
4. PR is approved and merged

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in GitHub Discussions
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make Email Copilot better for everyone. Thank you for taking the time to contribute!
