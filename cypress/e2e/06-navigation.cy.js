/**
 * Navigation E2E Tests
 * Tests application navigation, routing, and navigation state management
 */

describe('Navigation Functionality', () => {
  let testUser;

  beforeEach(() => {
    cy.fixture('users').then((users) => {
      testUser = {
        ...users.validUser,
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com'
      };
    });

    // Setup API interceptors
    cy.intercept('GET', '**/articles?**').as('getArticles');
    cy.intercept('GET', '**/tags').as('getTags');
  });

  describe('Unauthenticated Navigation', () => {
    it('should display correct navigation for unauthenticated users', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Verify brand/logo
      cy.get('.navbar-brand').should('contain', 'conduit').should('be.visible');

      // Verify unauthenticated navigation links
      cy.get('.navbar .nav-link[href="#/"]').should('contain', 'Home');
      cy.get('.navbar .nav-link[href="#/login"]').should('contain', 'Sign in');
      cy.get('.navbar .nav-link[href="#/register"]').should('contain', 'Sign up');

      // Should not show authenticated links
      cy.get('.navbar .nav-link[href="#/editor"]').should('not.exist');
      cy.get('.navbar .nav-link[href="#/settings"]').should('not.exist');
    });

    it('should navigate to home page', () => {
      cy.visit('/login'); // Start from different page
      
      cy.get('.navbar-brand').safeClick();
      cy.verifyURL('/');
      cy.get('.container').should('be.visible');
    });

    it('should navigate to login page', () => {
      cy.visit('/');
      
      cy.get('.navbar .nav-link[href="#/login"]').safeClick();
      cy.verifyURL('/login');
      cy.get('.auth-page').should('be.visible');
      cy.get('.auth-page h1').should('contain', 'Sign in');
    });

    it('should navigate to register page', () => {
      cy.visit('/');
      
      cy.get('.navbar .nav-link[href="#/register"]').safeClick();
      cy.verifyURL('/register');
      cy.get('.auth-page').should('be.visible');
      cy.get('.auth-page h1').should('contain', 'Sign up');
    });

    it('should redirect protected routes to login/home', () => {
      // Try to access protected routes directly
      const protectedRoutes = ['/editor', '/settings'];
      
      protectedRoutes.forEach(route => {
        cy.visit(route);
        // Should redirect to home or login (depends on implementation)
        cy.url().should('not.include', route);
      });
    });
  });

  describe('Authenticated Navigation', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should display correct navigation for authenticated users', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Verify brand/logo
      cy.get('.navbar-brand').should('contain', 'conduit').should('be.visible');

      // Verify authenticated navigation links
      cy.get('.navbar .nav-link[href="#/"]').should('contain', 'Home');
      cy.get('.navbar .nav-link[href="#/editor"]').should('contain', 'New Article');
      cy.get('.navbar .nav-link[href="#/settings"]').should('contain', 'Settings');
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      // Should not show unauthenticated links
      cy.get('.navbar .nav-link[href="#/login"]').should('not.exist');
      cy.get('.navbar .nav-link[href="#/register"]').should('not.exist');
    });

    it('should navigate to editor page', () => {
      cy.visit('/');
      
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');
      cy.get('.editor-page').should('be.visible');
      cy.get('[placeholder="Article Title"]').should('be.visible');
    });

    it('should navigate to settings page', () => {
      cy.visit('/');
      
      cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
      cy.verifyURL('/settings');
      cy.get('.settings-page').should('be.visible');
      cy.get('[placeholder="Your Name"]').should('have.value', testUser.username);
    });

    it('should navigate to user profile', () => {
      cy.visit('/');
      
      cy.get('.navbar .nav-link').contains(testUser.username).safeClick();
      cy.verifyURL(`/@${testUser.username}`);
      cy.get('.user-info').should('be.visible');
      cy.get('.user-info h4').should('contain', testUser.username);
    });

    it('should allow access to all protected routes', () => {
      const protectedRoutes = [
        { path: '/editor', selector: '.editor-page' },
        { path: '/settings', selector: '.settings-page' }
      ];
      
      protectedRoutes.forEach(route => {
        cy.visit(route.path);
        cy.verifyURL(route.path);
        cy.get(route.selector).should('be.visible');
      });
    });
  });

  describe('Navigation State Management', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should maintain active navigation state', () => {
      // Home should be active by default
      cy.visit('/');
      cy.get('.navbar .nav-link[href="#/"]').should('have.class', 'active').or('have.class', 'router-link-active');

      // Navigate to editor and check active state
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.get('.navbar .nav-link[href="#/editor"]').should('have.class', 'active').or('have.class', 'router-link-active');

      // Navigate to settings and check active state
      cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
      cy.get('.navbar .nav-link[href="#/settings"]').should('have.class', 'active').or('have.class', 'router-link-active');
    });

    it('should persist navigation state across page reloads', () => {
      cy.visit('/editor');
      cy.verifyURL('/editor');
      
      cy.reload();
      cy.waitForPageLoad();
      
      // Should remain on editor page
      cy.verifyURL('/editor');
      cy.get('.editor-page').should('be.visible');
      
      // Navigation should still show authenticated state
      cy.get('.navbar .nav-link').should('contain', testUser.username);
    });

    it('should handle browser back/forward navigation', () => {
      cy.visit('/');
      cy.verifyURL('/');

      // Navigate to editor
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');

      // Navigate to settings
      cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
      cy.verifyURL('/settings');

      // Use browser back button
      cy.go('back');
      cy.verifyURL('/editor');
      cy.get('.editor-page').should('be.visible');

      // Use browser forward button
      cy.go('forward');
      cy.verifyURL('/settings');
      cy.get('.settings-page').should('be.visible');
    });
  });

  describe('Deep Linking and Direct URLs', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should handle direct URL access to pages', () => {
      const pages = [
        { url: '/', selector: '.home-page' },
        { url: '/editor', selector: '.editor-page' },
        { url: '/settings', selector: '.settings-page' }
      ];

      pages.forEach(page => {
        cy.visit(page.url);
        cy.verifyURL(page.url);
        cy.get(page.selector).should('be.visible');
      });
    });

    it('should handle profile URLs correctly', () => {
      const profileUrl = `/@${testUser.username}`;
      
      cy.visit(profileUrl);
      cy.verifyURL(profileUrl);
      cy.get('.user-info').should('be.visible');
      cy.get('.user-info h4').should('contain', testUser.username);
    });

    it('should handle article URLs correctly', () => {
      // Create an article first
      cy.fixture('articles').then((articles) => {
        const testArticle = {
          ...articles.sampleArticle,
          title: 'Navigation Test Article ' + Date.now()
        };

        cy.getCurrentUserToken().then(token => {
          cy.createArticleAPI(testArticle, token).then(article => {
            const articleUrl = `/article/${article.slug}`;
            
            cy.visit(articleUrl);
            cy.verifyURL(articleUrl);
            cy.get('.article-page').should('be.visible');
            cy.get('.article-page h1').should('contain', testArticle.title);
          });
        });
      });
    });
  });

  describe('Navigation Error Handling', () => {
    it('should handle 404 pages gracefully', () => {
      cy.visit('/nonexistent-page');
      
      // Should handle 404 gracefully (exact behavior depends on implementation)
      cy.get('body').should('be.visible');
      cy.get('.navbar').should('be.visible');
    });

    it('should handle invalid user profiles', () => {
      cy.visit('/@nonexistentuser');
      
      // Should handle gracefully
      cy.get('body').should('be.visible');
      cy.get('.navbar').should('be.visible');
    });

    it('should handle invalid article slugs', () => {
      cy.visit('/article/nonexistent-article-slug');
      
      // Should handle gracefully
      cy.get('body').should('be.visible');
      cy.get('.navbar').should('be.visible');
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should be responsive on mobile devices', () => {
      cy.viewport('iphone-6');
      cy.visit('/');
      
      // Navigation should be visible and functional on mobile
      cy.get('.navbar').should('be.visible');
      cy.get('.navbar-brand').should('be.visible');
      
      // Navigation links should be accessible
      cy.get('.navbar .nav-link').should('be.visible');
    });

    it('should handle navigation on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/');
      
      // Navigation should work on tablets
      cy.get('.navbar').should('be.visible');
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');
      cy.get('.editor-page').should('be.visible');
    });
  });

  describe('Navigation Performance', () => {
    it('should navigate between pages quickly', () => {
      cy.registerUser(testUser);
      
      const startTime = Date.now();
      
      cy.visit('/');
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.get('.editor-page').should('be.visible').then(() => {
        const navigationTime = Date.now() - startTime;
        expect(navigationTime).to.be.lessThan(3000); // Should navigate within 3 seconds
      });
    });

    it('should handle rapid navigation changes', () => {
      cy.registerUser(testUser);
      cy.visit('/');
      
      // Rapidly navigate between pages
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
      cy.get('.navbar .nav-link[href="#/"]').safeClick();
      
      // Should end up on the last clicked page
      cy.verifyURL('/');
      cy.get('.home-page').should('be.visible');
    });
  });

  describe('Navigation Accessibility', () => {
    it('should have proper ARIA attributes and semantic HTML', () => {
      cy.visit('/');
      
      // Navigation should use proper semantic elements
      cy.get('nav.navbar').should('exist');
      
      // Links should be properly formed
      cy.get('.navbar .nav-link').each($link => {
        cy.wrap($link).should('have.attr', 'href');
      });
    });

    it('should be keyboard navigable', () => {
      cy.visit('/');
      
      // Focus on first navigation link
      cy.get('.navbar .nav-link').first().focus();
      
      // Should be able to tab through navigation links
      cy.focused().tab();
      cy.focused().should('have.class', 'nav-link');
    });
  });
});