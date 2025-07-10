/**
 * Article related custom commands
 */

/**
 * Create article via API
 */
Cypress.Commands.add('createArticleAPI', (articleData, userToken) => {
  const article = {
    title: articleData.title || 'Test Article ' + Date.now(),
    description: articleData.description || 'Test article description',
    body: articleData.body || 'This is the body of the test article.',
    tagList: articleData.tagList || ['test', 'cypress'],
    ...articleData
  };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/articles`,
    headers: {
      'Authorization': `Token ${userToken}`
    },
    body: {
      article: article
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200 || response.status === 201) {
      return cy.wrap(response.body.article);
    } else {
      cy.log('Article creation failed:', response.body);
      return cy.wrap(null);
    }
  });
});

/**
 * Create article via UI
 */
Cypress.Commands.add('createArticleUI', (articleData) => {
  cy.visit('/editor');
  cy.waitForPageLoad();
  
  // Fill article form
  cy.get('[placeholder="Article Title"]').clearAndType(articleData.title);
  cy.get('[placeholder="What\'s this article about?"]').clearAndType(articleData.description);
  cy.get('[placeholder="Write your article (in markdown)"]').clearAndType(articleData.body);
  
  // Add tags if provided
  if (articleData.tagList && articleData.tagList.length > 0) {
    articleData.tagList.forEach(tag => {
      cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
    });
  }
  
  // Publish article
  cy.get('.btn-primary').contains('Publish Article').safeClick();
  
  // Wait for redirect to article page
  cy.url().should('include', '/article/');
  cy.get('.article-page h1').should('contain', articleData.title);
});

/**
 * Edit article via UI
 */
Cypress.Commands.add('editArticleUI', (slug, newData) => {
  cy.visit(`/editor/${slug}`);
  cy.waitForPageLoad();
  
  if (newData.title) {
    cy.get('[placeholder="Article Title"]').clear().type(newData.title);
  }
  if (newData.description) {
    cy.get('[placeholder="What\'s this article about?"]').clear().type(newData.description);
  }
  if (newData.body) {
    cy.get('[placeholder="Write your article (in markdown)"]').clear().type(newData.body);
  }
  
  // Update tags if provided
  if (newData.tagList) {
    // Remove existing tags
    cy.get('.tag-default.tag-pill .ion-close-round').each($el => {
      cy.wrap($el).click();
    });
    
    // Add new tags
    newData.tagList.forEach(tag => {
      cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
    });
  }
  
  // Update article
  cy.get('.btn-primary').contains('Publish Article').safeClick();
  
  // Verify update
  cy.url().should('include', '/article/');
  if (newData.title) {
    cy.get('.article-page h1').should('contain', newData.title);
  }
});

/**
 * Delete article via UI
 */
Cypress.Commands.add('deleteArticleUI', (slug) => {
  cy.visit(`/article/${slug}`);
  cy.waitForPageLoad();
  
  cy.get('.article-actions .btn-outline-danger')
    .contains('Delete Article')
    .safeClick();
  
  // Verify redirect to home page
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
});

/**
 * Favorite/unfavorite article
 */
Cypress.Commands.add('toggleFavoriteArticle', (slug) => {
  cy.visit(`/article/${slug}`);
  cy.waitForPageLoad();
  
  cy.get('.article-meta .btn-outline-primary')
    .contains('Favorite Article')
    .safeClick();
});

/**
 * Add comment to article
 */
Cypress.Commands.add('addCommentToArticle', (slug, commentBody) => {
  cy.visit(`/article/${slug}`);
  cy.waitForPageLoad();
  
  cy.get('.comment-form textarea')
    .clearAndType(commentBody);
  
  cy.get('.comment-form .btn-primary')
    .contains('Post Comment')
    .safeClick();
  
  // Verify comment was added
  cy.get('.comment-body p').should('contain', commentBody);
});

/**
 * Delete comment from article
 */
Cypress.Commands.add('deleteCommentFromArticle', (commentText) => {
  cy.get('.comment-body p')
    .contains(commentText)
    .parent()
    .parent()
    .find('.mod-options .ion-trash-a')
    .safeClick();
  
  // Verify comment was deleted
  cy.get('.comment-body p').should('not.contain', commentText);
});

/**
 * Verify article exists in list
 */
Cypress.Commands.add('verifyArticleInList', (title) => {
  cy.get('.article-preview h1 a').should('contain', title);
});

/**
 * Click on article from list
 */
Cypress.Commands.add('clickArticleFromList', (title) => {
  cy.get('.article-preview h1 a')
    .contains(title)
    .safeClick();
  
  cy.url().should('include', '/article/');
  cy.get('.article-page h1').should('contain', title);
});

/**
 * Verify article metadata
 */
Cypress.Commands.add('verifyArticleMetadata', (expectedData) => {
  if (expectedData.author) {
    cy.get('.article-meta .author').should('contain', expectedData.author);
  }
  if (expectedData.date) {
    cy.get('.article-meta .date').should('contain', expectedData.date);
  }
  if (expectedData.tags) {
    expectedData.tags.forEach(tag => {
      cy.get('.tag-default').should('contain', tag);
    });
  }
});