/**
 * Homepage E2E Tests
 * Tests home page functionality including feeds, tags, and article browsing
 */

describe('Homepage Functionality', () => {
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
    cy.intercept('GET', '**/articles/feed?**').as('getFeed');
    cy.intercept('GET', '**/tags').as('getTags');
    cy.intercept('POST', '**/articles/*/favorite').as('favoriteArticle');
    cy.intercept('DELETE', '**/articles/*/favorite').as('unfavoriteArticle');
  });

  describe('Unauthenticated Homepage', () => {
    it('should display the banner for unauthenticated users', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Verify banner is visible
      cy.get('.banner').should('be.visible');
      cy.get('.banner h1').should('contain', 'conduit');
      cy.get('.banner p').should('contain', 'A place to share your knowledge');
    });

    it('should load global feed by default', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Wait for articles to load
      cy.waitForAPI('@getArticles');

      // Verify global feed tab is active
      cy.get('.feed-toggle .nav-link.active').should('contain', 'Global Feed');

      // Verify articles are displayed
      cy.get('.article-preview').should('have.length.greaterThan', 0);
    });

    it('should not show personal feed tab when unauthenticated', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Personal feed tab should not be visible
      cy.get('.feed-toggle .nav-link').should('not.contain', 'Your Feed');
      cy.get('.feed-toggle .nav-link').should('contain', 'Global Feed');
    });

    it('should display popular tags in sidebar', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Wait for tags to load
      cy.waitForAPI('@getTags');

      // Verify tags sidebar
      cy.get('.sidebar').should('be.visible');
      cy.get('.sidebar p').should('contain', 'Popular Tags');
      cy.get('.tag-list .tag-pill').should('have.length.greaterThan', 0);
    });

    it('should filter articles by tag when tag is clicked', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getTags');

      // Click on a tag
      cy.get('.tag-list .tag-pill').first().then($tag => {
        const tagText = $tag.text().trim();
        cy.wrap($tag).safeClick();

        // Verify tag feed is active
        cy.get('.feed-toggle .nav-link.active').should('contain', `#${tagText}`);

        // Wait for filtered articles
        cy.waitForAPI('@getArticles');

        // Verify URL contains tag parameter
        cy.url().should('include', `tag=${encodeURIComponent(tagText)}`);
      });
    });

    it('should display article previews with correct information', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles');

      // Check first article preview
      cy.get('.article-preview').first().within(() => {
        // Should have article metadata
        cy.get('.article-meta').should('be.visible');
        cy.get('.article-meta .author').should('be.visible');
        cy.get('.article-meta .date').should('be.visible');

        // Should have favorite button
        cy.get('.btn-outline-primary').should('contain', 'Favorite Article');

        // Should have title and description
        cy.get('h1 a').should('be.visible');
        cy.get('p').should('be.visible');

        // Should have "Read more" link
        cy.get('.preview-link').should('contain', 'Read more');

        // Should have tags if any
        cy.get('.tag-default').should('exist');
      });
    });

    it('should navigate to article page when title is clicked', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles');

      // Click on first article title
      cy.get('.article-preview h1 a').first().then($link => {
        const href = $link.attr('href');
        cy.wrap($link).safeClick();

        // Should navigate to article page
        cy.url().should('include', '/article/');
        cy.get('.article-page').should('be.visible');
      });
    });

    it('should navigate to author profile when author is clicked', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles');

      // Click on first article author
      cy.get('.article-preview .article-meta .author').first().then($author => {
        const authorName = $author.text().trim();
        cy.wrap($author).safeClick();

        // Should navigate to author profile
        cy.url().should('include', `/@${authorName}`);
        cy.get('.user-info').should('be.visible');
      });
    });
  });

  describe('Authenticated Homepage', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should not display banner for authenticated users', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Banner should not be visible
      cy.get('.banner').should('not.exist');
    });

    it('should show both personal and global feed tabs', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Both feed tabs should be visible
      cy.get('.feed-toggle .nav-link').should('contain', 'Your Feed');
      cy.get('.feed-toggle .nav-link').should('contain', 'Global Feed');
    });

    it('should switch between personal and global feeds', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Default should be personal feed
      cy.get('.feed-toggle .nav-link.active').should('contain', 'Your Feed');

      // Switch to global feed
      cy.get('.feed-toggle .nav-link').contains('Global Feed').safeClick();
      cy.waitForAPI('@getArticles');
      cy.get('.feed-toggle .nav-link.active').should('contain', 'Global Feed');

      // Switch back to personal feed
      cy.get('.feed-toggle .nav-link').contains('Your Feed').safeClick();
      cy.waitForAPI('@getFeed');
      cy.get('.feed-toggle .nav-link.active').should('contain', 'Your Feed');
    });

    it('should allow favoriting articles from homepage', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.get('.feed-toggle .nav-link').contains('Global Feed').safeClick();
      cy.waitForAPI('@getArticles');

      // Click favorite button on first article
      cy.get('.article-preview .btn-outline-primary').first().then($btn => {
        const initialCount = parseInt($btn.text().match(/\\d+/) || ['0']);
        cy.wrap($btn).safeClick();

        // Wait for API call
        cy.waitForAPI('@favoriteArticle');

        // Verify button state changed
        cy.wrap($btn).should('have.class', 'btn-primary');
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles');

      // Check if pagination exists (depends on data)
      cy.get('body').then($body => {
        if ($body.find('.pagination').length > 0) {
          cy.get('.pagination').should('be.visible');
          cy.get('.page-item').should('have.length.greaterThan', 1);
        }
      });
    });

    it('should navigate to next page when pagination is clicked', () => {
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles');

      // Check if pagination exists and click next page
      cy.get('body').then($body => {
        if ($body.find('.pagination .page-item').length > 1) {
          cy.get('.pagination .page-item').eq(1).find('.page-link').safeClick();
          cy.waitForAPI('@getArticles');

          // Verify URL changed
          cy.url().should('include', 'page=2');

          // Verify active page indicator
          cy.get('.pagination .page-item.active .page-link').should('contain', '2');
        }
      });
    });
  });

  describe('Feed Performance and Loading', () => {
    it('should load articles within reasonable time', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticles').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(5000); // Should load within 5 seconds
      });
    });

    it('should handle empty feed gracefully', () => {
      // Mock empty response
      cy.intercept('GET', '**/articles/feed?**', { fixture: 'empty-articles.json' }).as('getEmptyFeed');
      
      cy.registerUser(testUser);
      cy.visit('/');
      cy.waitForPageLoad();

      // Personal feed might be empty for new user
      cy.get('.feed-toggle .nav-link').contains('Your Feed').safeClick();
      
      // Should handle empty state gracefully
      cy.get('body').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      // Mock error response
      cy.intercept('GET', '**/articles?**', { statusCode: 500 }).as('getArticlesError');
      
      cy.visit('/');
      cy.waitForPageLoad();

      // Should not crash the app
      cy.get('.navbar').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile viewport', () => {
      cy.viewport('iphone-6');
      cy.visit('/');
      cy.waitForPageLoad();

      // Check if elements are visible and properly arranged
      cy.get('.navbar').should('be.visible');
      cy.get('.container').should('be.visible');
      
      // Tags sidebar should still be accessible
      cy.get('.sidebar').should('be.visible');
    });

    it('should be responsive on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit('/');
      cy.waitForPageLoad();

      // Verify layout works on tablet
      cy.get('.navbar').should('be.visible');
      cy.get('.container').should('be.visible');
      cy.get('.sidebar').should('be.visible');
    });
  });
});