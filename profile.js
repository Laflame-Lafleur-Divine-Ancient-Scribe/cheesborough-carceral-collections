document.addEventListener('DOMContentLoaded', async () => {
  const community = window.CCCCommunity;
  const status = document.querySelector('#profile-status');
  const input = document.querySelector('#profile-avatar-input');
  const image = document.querySelector('#profile-avatar-preview');
  const fallback = document.querySelector('#profile-avatar-initials');
  const remove = document.querySelector('#profile-avatar-remove');
  let user = await community.restoreSession();
  if (!user) {
    location.replace('LOGIN.html?returnTo=%2FPROFILE.html');
    return;
  }

  const setAvatar = () => {
    const source = community.avatarUrl(user);
    fallback.textContent = community.initials(user.displayName);
    fallback.hidden = Boolean(source);
    image.hidden = !source;
    image.src = source || '';
    remove.hidden = !source;
    remove.disabled = !source;
  };
  document.querySelector('#profile-display-name').textContent = user.displayName;
  document.querySelector('#profile-email').textContent = 'Your email address is private.';
  setAvatar();

  const resizeImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(Error('The selected image could not be read.'));
    reader.onload = () => {
      const photo = new Image();
      photo.onerror = () => reject(Error('The selected file is not a supported image.'));
      photo.onload = () => {
        const size = Math.min(320, photo.naturalWidth, photo.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext('2d');
        const offsetX = (photo.naturalWidth - Math.min(photo.naturalWidth, photo.naturalHeight)) / 2;
        const offsetY = (photo.naturalHeight - Math.min(photo.naturalWidth, photo.naturalHeight)) / 2;
        const crop = Math.min(photo.naturalWidth, photo.naturalHeight);
        context.drawImage(photo, offsetX, offsetY, crop, crop, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      photo.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
      status.textContent = 'Choose a JPG, PNG, or WebP image smaller than 12 MB.';
      input.value = '';
      return;
    }
    status.textContent = 'Preparing your profile photo…';
    try {
      const payload = await community.request('/api/auth/avatar', { method: 'POST', body: JSON.stringify({ imageData: await resizeImage(file) }) });
      user = { ...user, avatarUpdatedAt: payload.avatarUpdatedAt };
      setAvatar(); community.renderNav(user);
      status.textContent = 'Your profile photo has been saved.';
    } catch (error) { status.textContent = error.message; }
    input.value = '';
  });

  remove.addEventListener('click', async () => {
    remove.disabled = true;
    try {
      await community.request('/api/auth/avatar', { method: 'DELETE' });
      user = { ...user, avatarUpdatedAt: null };
      setAvatar(); community.renderNav(user);
      status.textContent = 'Your profile photo has been removed.';
    } catch (error) { status.textContent = error.message; }
    remove.disabled = false;
  });
});
