# Contributing Guide

## Overview

Thank you for considering contributing to this project! This repository showcases a comprehensive E2E testing framework for the React Redux RealWorld Example App. Your contributions help improve the quality and coverage of our QA automation practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Testing Guidelines](#testing-guidelines)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js 16 or higher
- npm or yarn
- Git
- Chrome browser (for Cypress)

### Fork and Clone

1. Fork the repository to your GitHub account
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/react-redux-realworld-example-app.git
   cd react-redux-realworld-example-app
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-username/react-redux-realworld-example-app.git
   ```

## Development Setup

### Installation

```bash
# Install dependencies
npm install

# Start the application
npm start

# Verify tests are working
npm run cypress:open
```

### Environment Configuration

Create a `.env` file for local development:
```
PORT=4100
CYPRESS_baseUrl=http://localhost:4100
CYPRESS_apiUrl=https://conduit.productionready.io/api
```

## Testing Guidelines

### Adding New Tests

When adding new test cases:

1. **Choose the Right Test Suite**: Place tests in the appropriate category:
   - `01-authentication.cy.js` - Login, registration, logout
   - `02-homepage.cy.js` - Homepage functionality
   - `03-article-management.cy.js` - Article CRUD operations
   - `04-comments.cy.js` - Comment functionality
   - `05-user-profile.cy.js` - User profiles and social features
   - `06-navigation.cy.js` - Navigation and routing
   - `07-integration.cy.js` - End-to-end workflows

2. **Follow Naming Conventions**:
   ```javascript
   describe('Feature Name', () => {
     describe('Specific Functionality', () => {
       it('should perform specific action successfully', () => {
         // Test implementation
       });
     });
   });
   ```

3. **Use Custom Commands**: Leverage existing custom commands when possible:
   ```javascript
   // Good
   cy.registerUser(testUser);
   cy.createArticleUI(articleData);
   
   // Avoid duplicating common functionality
   ```

4. **Test Data Management**: Use fixtures for static data, generate dynamic data for uniqueness:
   ```javascript
   cy.fixture('users').then((users) => {
     const testUser = {
       ...users.validUser,
       username: 'testuser_' + Date.now(),
       email: 'testuser_' + Date.now() + '@test.com'
     };
   });
   ```

### Test Structure Guidelines

#### Test Organization
```javascript
describe('Feature Area', () => {
  let testData;

  beforeEach(() => {
    // Setup test data and API interceptors
    cy.fixture('data').then((data) => {
      testData = data;
    });
    
    cy.intercept('POST', '**/api/endpoint').as('apiCall');
  });

  describe('Specific Functionality', () => {
    it('should handle positive case', () => {
      // Arrange
      cy.visit('/page');
      
      // Act
      cy.get('.element').click();
      
      // Assert
      cy.waitForAPI('@apiCall');
      cy.verifyURL('/expected-page');
    });

    it('should handle negative case', () => {
      // Test error scenarios
    });

    it('should handle edge case', () => {
      // Test boundary conditions
    });
  });
});
```

#### Test Isolation
- Each test should be independent
- Use `beforeEach` for setup
- Clear state between tests
- Don't rely on test execution order

### Adding Custom Commands

When creating new custom commands:

1. **Choose the Right File**:
   - `commands.js` - Generic utility commands
   - `auth-commands.js` - Authentication-related commands
   - `article-commands.js` - Article management commands
   - `user-commands.js` - User interaction commands

2. **Follow Command Patterns**:
   ```javascript
   /**
    * Description of what the command does
    * @param {Object} parameter - Description of parameter
    * @example cy.customCommand(data)
    */
   Cypress.Commands.add('customCommand', (parameter) => {
     // Implementation with error handling
     return cy.get('.element').then(() => {
       // Return chainable result if needed
     });
   });
   ```

3. **Include Error Handling**:
   ```javascript
   Cypress.Commands.add('safeAction', () => {
     cy.get('.element')
       .should('be.visible')
       .should('not.be.disabled')
       .click();
   });
   ```

### Test Data Guidelines

#### Using Fixtures
```javascript
// Create/update fixture files in cypress/fixtures/
{
  "testScenario": {
    "title": "Test Article Title",
    "description": "Test description",
    "body": "Test content",
    "tagList": ["test", "automation"]
  }
}
```

#### Dynamic Data Generation
```javascript
// Generate unique data to avoid conflicts
const generateTestUser = () => ({
  username: 'testuser_' + Date.now(),
  email: `testuser_${Date.now()}@test.com`,
  password: 'testpassword123'
});
```

## Code Standards

### JavaScript/Cypress Conventions

1. **Use Modern JavaScript**: ES6+ features
2. **Consistent Formatting**: Use Prettier configuration
3. **Clear Variable Names**: Descriptive and meaningful
4. **Error Handling**: Graceful handling of failures
5. **Comments**: Document complex logic and custom commands

### Selector Strategy

Priority order for element selection:
1. **Data attributes**: `[data-cy="element"]`, `[data-testid="element"]`
2. **CSS classes**: `.specific-class`
3. **Semantic elements**: `nav`, `article`, `button`
4. **Attributes**: `[placeholder="Email"]`, `[href="#/page"]`
5. **Text content**: `contains('Click me')`

### API Interaction

```javascript
// Setup interceptors for API monitoring
beforeEach(() => {
  cy.intercept('POST', '**/api/users').as('createUser');
  cy.intercept('GET', '**/api/articles').as('getArticles');
});

// Use in tests
cy.waitForAPI('@createUser');
cy.waitForAPI('@getArticles');
```

## Pull Request Process

### Before Submitting

1. **Sync with Upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Run Tests Locally**:
   ```bash
   npm run test:e2e
   npm run cypress:run
   ```

4. **Check Code Quality**:
   ```bash
   # Ensure all tests pass
   # Verify no console errors
   # Test in multiple browsers if possible
   ```

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Code follows project conventions
- [ ] Commit messages are clear and descriptive
- [ ] No sensitive data in commits
- [ ] Screenshots/videos for UI changes

### PR Description Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Test improvement
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Existing tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Screenshots/Videos
If applicable, add screenshots or videos demonstrating the changes.

## Additional Notes
Any additional information reviewers should know.
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: At least one reviewer required
3. **Testing**: All tests must pass
4. **Approval**: Required before merge
5. **Merge**: Squash and merge preferred

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- Browser: [e.g., Chrome 91]
- OS: [e.g., Windows 10]
- Node Version: [e.g., 16.14]
- Cypress Version: [e.g., 14.5.1]

## Screenshots/Videos
If applicable, add screenshots or videos.

## Additional Context
Any other relevant information.
```

### Feature Requests

```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What other solutions were considered?

## Additional Context
Any other relevant information.
```

## Code of Conduct

### Our Standards

- **Respectful Communication**: Be kind and professional
- **Inclusive Environment**: Welcome all contributors
- **Constructive Feedback**: Focus on improving code quality
- **Collaborative Spirit**: Work together toward common goals

### Unacceptable Behavior

- Harassment or discrimination
- Inappropriate language or content
- Personal attacks or trolling
- Spam or off-topic discussions

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/feature-name` - Feature development
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Commit Convention

```bash
# Format: type(scope): description
feat(auth): add login validation tests
fix(homepage): resolve tag filtering issue
docs(readme): update installation instructions
test(articles): add edge case for article creation
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `style` - Code formatting
- `ci` - CI/CD changes

## Getting Help

### Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Framework Guide](./testing-guide.md)
- [Pipeline Flow Diagram](./pipeline-flow-diagram.md)

### Contact

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [Maintainer contact if needed]

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Project documentation

Thank you for contributing to this QA automation showcase project! Your efforts help demonstrate best practices in E2E testing and CI/CD pipeline implementation.