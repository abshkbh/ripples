(() => {
  'use strict';
  if (location.origin !== 'https://my.nanit.com') return;
  NanitActivityView.mount({ demo: false });
})();
