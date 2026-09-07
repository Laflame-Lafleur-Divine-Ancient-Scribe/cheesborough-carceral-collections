/* Explicit moderation forms work in embedded viewers without browser prompts. */
(() => {
  window.CCCOwnerComments = {
    bind(root, { request, reload, notify }) {
      root.querySelectorAll('[data-comment-form]').forEach(form => {
        const action = form.elements.action;
        const confirmation = form.querySelector('[data-delete-confirmation]');
        const status = form.querySelector('[role="status"]');
        let saving = false;
        action.addEventListener('change', () => {
          confirmation.hidden = action.value !== 'delete';
          form.elements.confirmDelete.checked = false;
          status.textContent = '';
        });
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (saving) return;
          const selected = action.value;
          if (!['approve', 'reject', 'hide', 'delete'].includes(selected)) {
            status.textContent = 'Choose a moderation action first.';
            return;
          }
          if (selected === 'delete' && !form.elements.confirmDelete.checked) {
            status.textContent = 'Confirm permanent deletion before applying.';
            return;
          }
          const body = { action: selected, reason: form.elements.reason.value.trim() };
          saving = true;
          Array.from(form.elements).forEach(element => { element.disabled = true; });
          form.setAttribute('aria-busy', 'true');
          status.textContent = 'Saving moderation decision…';
          try {
            await request('/api/owner/comments/' + encodeURIComponent(form.dataset.commentForm), {
              method: 'POST', body: JSON.stringify(body)
            });
          } catch (error) {
            status.textContent = error.message || 'The decision could not be saved. Try again.';
            saving = false;
            Array.from(form.elements).forEach(element => { element.disabled = false; });
            form.setAttribute('aria-busy', 'false');
            return;
          }
          const message = {
            approve: 'Comment approved and published.', reject: 'Comment rejected.',
            hide: 'Comment hidden and returned to pending.', delete: 'Comment deleted.'
          }[selected];
          status.textContent = message;
          // Refresh from the service only after the transaction has committed.
          try {
            const refreshed = await reload();
            notify(refreshed === false ? message + ' Refresh the record to see the updated count.' : message);
          } catch {
            notify(message + ' Refresh the record to see the updated count.');
          }
        });
      });
    }
  };
})();
