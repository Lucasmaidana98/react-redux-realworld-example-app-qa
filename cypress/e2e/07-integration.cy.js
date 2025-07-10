/**
 * Integration E2E Tests
 * Tests complex user workflows and integration scenarios
 */

describe('Integration Workflows', () => {
  let testUser;
  let secondUser;

  beforeEach(() => {
    cy.fixture('users').then((users) => {
      testUser = {
        ...users.validUser,
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com'
      };

      secondUser = {
        ...users.secondUser,
        username: 'seconduser_' + Date.now(),
        email: 'seconduser_' + Date.now() + '@test.com'
      };
    });

    // Setup comprehensive API interceptors
    cy.intercept('POST', '**/users').as('registerUser');
    cy.intercept('POST', '**/users/login').as('loginUser');
    cy.intercept('POST', '**/articles').as('createArticle');
    cy.intercept('POST', '**/articles/*/comments').as('postComment');
    cy.intercept('POST', '**/articles/*/favorite').as('favoriteArticle');
    cy.intercept('POST', '**/profiles/*/follow').as('followUser');
    cy.intercept('GET', '**/articles?**').as('getArticles');
    cy.intercept('GET', '**/articles/feed?**').as('getFeed');
  });

  describe('Complete User Journey', () => {
    it('should complete a full user registration to article publication workflow', () => {
      // 1. Register new user
      cy.visit('/register');
      cy.get('[placeholder="Your Name"]').clearAndType(testUser.username);
      cy.get('[placeholder="Email"]').clearAndType(testUser.email);
      cy.get('[placeholder="Password"]').clearAndType(testUser.password);
      cy.get('.auth-page .btn-primary').contains('Sign up').safeClick();
      cy.waitForAPI('@registerUser');
      cy.verifyURL('/');

      // 2. Verify user is logged in
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      // 3. Create a new article
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');

      const articleData = {
        title: 'My First Article ' + Date.now(),
        description: 'This is my first article on Conduit',
        body: '# Welcome to my article\\n\\nThis is the content of my first article. I hope you enjoy reading it!\\n\\n## Key Points\\n\\n- This is a test article\\n- Created during integration testing\\n- Demonstrates the full workflow',
        tags: ['testing', 'integration', 'first-article']
      };

      cy.get('[placeholder="Article Title"]').clearAndType(articleData.title);
      cy.get('[placeholder="What\'s this article about?"]').clearAndType(articleData.description);
      cy.get('[placeholder="Write your article (in markdown)"]').clearAndType(articleData.body);

      articleData.tags.forEach(tag => {
        cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
      });

      cy.get('.btn-primary').contains('Publish Article').safeClick();
      cy.waitForAPI('@createArticle');

      // 4. Verify article was created and is displayed
      cy.url().should('include', '/article/');
      cy.get('.article-page h1').should('contain', articleData.title);
      cy.get('.article-content').should('contain', 'Welcome to my article');

      // 5. Navigate back to home and verify article appears in feed
      cy.get('.navbar-brand').safeClick();
      cy.verifyURL('/');
      cy.waitForAPI('@getArticles');
      cy.get('.article-preview h1 a').should('contain', articleData.title);

      // 6. Visit own profile and verify article appears there
      cy.get('.navbar .nav-link').contains(testUser.username).safeClick();
      cy.get('.user-info h4').should('contain', testUser.username);
      cy.get('.article-preview h1 a').should('contain', articleData.title);
    });

    it('should complete a full social interaction workflow', () => {
      // Setup: Register two users and create content
      cy.registerUser(testUser);
      
      // User 1 creates an article
      cy.fixture('articles').then((articles) => {
        const testArticle = {
          ...articles.sampleArticle,
          title: 'Social Interaction Test ' + Date.now()
        };

        cy.getCurrentUserToken().then(token => {
          cy.createArticleAPI(testArticle, token).then(article => {
            // Register second user
            cy.registerUser(secondUser).then(() => {
              // User 2 workflow: follow, favorite, comment
              
              // 1. Visit article and read it
              cy.visit(`/article/${article.slug}`);
              cy.get('.article-page h1').should('contain', testArticle.title);

              // 2. Follow the author
              cy.get('.article-actions .btn-outline-secondary').contains('Follow').safeClick();
              cy.waitForAPI('@followUser');
              cy.get('.article-actions .btn-primary').should('contain', 'Unfollow');

              // 3. Favorite the article
              cy.get('.article-actions .btn-outline-primary').contains('Favorite').safeClick();
              cy.waitForAPI('@favoriteArticle');
              cy.get('.article-actions .btn-primary').should('contain', 'Unfavorite');

              // 4. Add a comment
              const commentText = 'Great article! Thanks for sharing this valuable information.';
              cy.get('.comment-form textarea').clearAndType(commentText);
              cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();
              cy.waitForAPI('@postComment');
              cy.get('.comment-body p').should('contain', commentText);

              // 5. Visit author's profile
              cy.get('.article-meta .author').safeClick();
              cy.url().should('include', `/@${testUser.username}`);
              cy.get('.user-info h4').should('contain', testUser.username);
              cy.get('.user-info .action-btn').should('contain', 'Unfollow');

              // 6. Check personal feed for followed user's articles
              cy.get('.navbar-brand').safeClick();
              cy.get('.feed-toggle .nav-link').contains('Your Feed').safeClick();
              cy.waitForAPI('@getFeed');
              // Should see followed user's article in personal feed
              cy.get('.article-preview h1 a').should('contain', testArticle.title);
            });
          });
        });
      });
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users interacting with the same content', () => {
      // Create users and article
      cy.registerUser(testUser);
      cy.fixture('articles').then((articles) => {
        const testArticle = {
          ...articles.sampleArticle,
          title: 'Multi-User Test Article ' + Date.now()
        };

        cy.getCurrentUserToken().then(token => {
          cy.createArticleAPI(testArticle, token).then(article => {
            
            // Multiple users interact with the same article
            const users = [];
            for (let i = 0; i < 3; i++) {
              users.push({
                username: `user${i}_` + Date.now(),
                email: `user${i}_` + Date.now() + '@test.com',
                password: 'password123'
              });
            }

            // Register multiple users and have them interact
            users.forEach((user, index) => {
              cy.registerUser(user).then(() => {
                cy.visit(`/article/${article.slug}`);
                
                // Each user adds a different comment
                const comment = `Comment from user ${index + 1}: This is a great article!`;
                cy.get('.comment-form textarea').clearAndType(comment);
                cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();
                cy.waitForAPI('@postComment');

                // Verify comment appears
                cy.get('.comment-body p').should('contain', comment);

                // Some users favorite the article
                if (index % 2 === 0) {
                  cy.get('.article-actions .btn-outline-primary').contains('Favorite').safeClick();
                  cy.waitForAPI('@favoriteArticle');
                }
              });
            });

            // Verify all interactions are preserved
            cy.clearAuth();
            cy.loginUserAPI(testUser);
            cy.visit(`/article/${article.slug}`);
            
            // Should see multiple comments
            cy.get('.comment-body p').should('have.length.greaterThan', 2);
            
            // Should see updated favorite count
            cy.get('.article-actions .btn-outline-primary').invoke('text').should('match', /\\d+/);
          });
        });
      });
    });
  });

  describe('Content Discovery Workflows', () => {
    it('should demonstrate complete content discovery flow', () => {
      // Setup content from multiple users
      const users = [testUser, secondUser];
      const articles = [];

      users.forEach((user, userIndex) => {
        cy.registerUser(user).then(() => {
          // Each user creates multiple articles with different tags
          cy.getCurrentUserToken().then(token => {
            for (let i = 0; i < 2; i++) {
              const articleData = {
                title: `Article ${i + 1} by ${user.username}`,
                description: `Description for article ${i + 1}`,
                body: `Content for article ${i + 1} by ${user.username}`,
                tagList: userIndex === 0 ? ['react', 'javascript'] : ['testing', 'cypress']
              };

              cy.createArticleAPI(articleData, token).then(article => {
                articles.push(article);
              });
            }
          });
        });
      });

      // Discovery workflow as a new user
      const discoveryUser = {
        username: 'discoverer_' + Date.now(),
        email: 'discoverer_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(discoveryUser).then(() => {
        // 1. Start on homepage and browse global feed
        cy.visit('/');
        cy.get('.feed-toggle .nav-link').contains('Global Feed').safeClick();
        cy.waitForAPI('@getArticles');

        // Should see articles from both users
        cy.get('.article-preview').should('have.length.greaterThan', 1);

        // 2. Filter by tag
        cy.get('.tag-list .tag-pill').contains('react').safeClick();
        cy.waitForAPI('@getArticles');
        cy.get('.feed-toggle .nav-link.active').should('contain', '#react');

        // 3. Read an article
        cy.get('.article-preview h1 a').first().safeClick();
        cy.url().should('include', '/article/');

        // 4. Follow the author and favorite the article
        cy.get('.article-actions .btn-outline-secondary').contains('Follow').safeClick();
        cy.waitForAPI('@followUser');
        cy.get('.article-actions .btn-outline-primary').contains('Favorite').safeClick();
        cy.waitForAPI('@favoriteArticle');

        // 5. Check personal feed now has content
        cy.get('.navbar-brand').safeClick();
        cy.get('.feed-toggle .nav-link').contains('Your Feed').safeClick();
        cy.waitForAPI('@getFeed');
        cy.get('.article-preview').should('have.length.greaterThan', 0);

        // 6. Explore author's profile
        cy.get('.article-preview .article-meta .author').first().safeClick();
        cy.url().should('include', '/@');
        cy.get('.user-info').should('be.visible');

        // 7. Check favorited articles in own profile
        cy.get('.navbar .nav-link').contains(discoveryUser.username).safeClick();
        cy.get('.articles-toggle .nav-link').contains('Favorited Articles').safeClick();
        cy.get('.article-preview').should('have.length.greaterThan', 0);
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle network errors gracefully during complex workflows', () => {
      cy.registerUser(testUser);

      // Simulate network error during article creation
      cy.visit('/editor');
      cy.get('[placeholder="Article Title"]').clearAndType('Test Article');
      cy.get('[placeholder="What\'s this article about?"]').clearAndType('Test Description');
      cy.get('[placeholder="Write your article (in markdown)"]').clearAndType('Test Content');

      // Mock error response
      cy.intercept('POST', '**/articles', { statusCode: 500 }).as('createArticleError');
      
      cy.get('.btn-primary').contains('Publish Article').safeClick();

      // Should handle error gracefully and stay on editor
      cy.verifyURL('/editor');
      cy.get('.editor-page').should('be.visible');

      // Content should be preserved
      cy.get('[placeholder="Article Title"]').should('have.value', 'Test Article');
    });

    it('should recover from authentication errors during workflows', () => {
      cy.registerUser(testUser);
      cy.visit('/');

      // Simulate auth token expiry
      cy.window().then(win => {
        win.localStorage.removeItem('jwt');
      });

      // Try to access protected route
      cy.visit('/editor');

      // Should redirect to login or show login state
      cy.get('.navbar .nav-link[href="#/login"]').should('exist');
    });
  });

  describe('Performance Integration', () => {
    it('should maintain good performance during complex workflows', () => {
      const startTime = Date.now();

      // Complete workflow timing
      cy.registerUser(testUser).then(() => {
        cy.visit('/editor');
        
        cy.fixture('articles').then((articles) => {
          const testArticle = articles.sampleArticle;
          
          cy.get('[placeholder="Article Title"]').clearAndType(testArticle.title);
          cy.get('[placeholder="What\'s this article about?"]').clearAndType(testArticle.description);
          cy.get('[placeholder="Write your article (in markdown)"]').clearAndType(testArticle.body);
          
          testArticle.tagList.forEach(tag => {
            cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
          });

          cy.get('.btn-primary').contains('Publish Article').safeClick();
          cy.waitForAPI('@createArticle');

          cy.url().should('include', '/article/').then(() => {
            const totalTime = Date.now() - startTime;
            expect(totalTime).to.be.lessThan(10000); // Complete workflow under 10 seconds
          });
        });
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across user sessions', () => {
      // User 1 creates content
      cy.registerUser(testUser);
      cy.fixture('articles').then((articles) => {
        const testArticle = {
          ...articles.sampleArticle,
          title: 'Consistency Test ' + Date.now()
        };

        cy.getCurrentUserToken().then(token => {
          cy.createArticleAPI(testArticle, token).then(article => {
            
            // User 2 interacts with the content
            cy.registerUser(secondUser).then(() => {
              cy.visit(`/article/${article.slug}`);
              
              // Add comment and favorite
              cy.get('.comment-form textarea').clearAndType('Test comment for consistency');
              cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();
              cy.waitForAPI('@postComment');

              cy.get('.article-actions .btn-outline-primary').contains('Favorite').safeClick();
              cy.waitForAPI('@favoriteArticle');

              // Switch back to User 1 and verify changes are visible
              cy.clearAuth();
              cy.loginUserAPI(testUser);
              cy.visit(`/article/${article.slug}`);

              // Should see the comment from User 2
              cy.get('.comment-body p').should('contain', 'Test comment for consistency');
              
              // Should see updated favorite count
              cy.get('.article-actions .btn-outline-primary').invoke('text').should('match', /\\d+/);
            });
          });
        });
      });
    });
  });
});