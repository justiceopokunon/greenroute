(() => {
  'use strict';

  // ─── Password visibility toggle ───────────────────────────────────────────
  document.querySelectorAll('[data-password-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.closest('.password-field').querySelector('input');
      const isHidden = field.type === 'password';
      field.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Hide' : 'Show';
    });
  });

  const setNote = (form, msg, isError = false) => {
    const note = form.querySelector('[data-form-note]');
    if (!note) return;
    note.textContent = msg;
    note.style.color = isError ? '#ef4444' : '';
  };

  const setLoading = (form, loading) => {
    const btn = form.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    const labels = {
      'signin': 'Take me riding',
      'signup': 'Join Green Route',
      'driver-signin': 'Start earning',
      'driver-signup': 'Create driver account'
    };
    btn.textContent = loading ? 'Please wait...' : (labels[form.dataset.authForm] || 'Submit');
  };

  // ─── Passenger sign-in ────────────────────────────────────────────────────
  const signinForm = document.querySelector('[data-auth-form="signin"]');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading(signinForm, true);
      setNote(signinForm, 'Signing you in...');

      const email    = signinForm.querySelector('[name="email"]').value.trim();
      const password = signinForm.querySelector('[name="password"]').value;

      try {
        const res  = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || data.error || 'Sign in failed');

        GreenRoute.utils.setStorage(GreenRoute.storage.passengerId, data.id);
        GreenRoute.utils.setStorage(GreenRoute.storage.userRole, 'passenger');

        setNote(signinForm, 'Signed in! Redirecting...');
        window.location.href = './passenger.html';

      } catch (err) {
        setNote(signinForm, err.message, true);
        setLoading(signinForm, false);
      }
    });
  }

  // ─── Passenger sign-up ────────────────────────────────────────────────────
  const signupForm = document.querySelector('[data-auth-form="signup"]');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading(signupForm, true);
      setNote(signupForm, 'Creating your account...');

      const firstName       = signupForm.querySelector('[name="firstName"]')?.value.trim();
      const lastName        = signupForm.querySelector('[name="lastName"]')?.value.trim();
      const name            = `${firstName} ${lastName}`.trim();
      const email           = signupForm.querySelector('[name="email"]').value.trim();
      const phone           = signupForm.querySelector('[name="phone"]')?.value.trim();
      const password        = signupForm.querySelector('[name="password"]').value;
      const confirmPassword = signupForm.querySelector('[name="confirmPassword"]')?.value;

      if (confirmPassword !== undefined && password !== confirmPassword) {
        setNote(signupForm, 'Passwords do not match', true);
        setLoading(signupForm, false);
        return;
      }

      try {
        const res  = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password, role: 'passenger' })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || data.error || 'Sign up failed');

        GreenRoute.utils.setStorage(GreenRoute.storage.passengerId, data.id);
        GreenRoute.utils.setStorage(GreenRoute.storage.userRole, 'passenger');

        setNote(signupForm, 'Account created! Redirecting...');
        window.location.href = './passenger.html';

      } catch (err) {
        setNote(signupForm, err.message, true);
        setLoading(signupForm, false);
      }
    });
  }

  // ─── Driver sign-in ───────────────────────────────────────────────────────
  const driverSigninForm = document.querySelector('[data-auth-form="driver-signin"]');
  if (driverSigninForm) {
    driverSigninForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading(driverSigninForm, true);
      setNote(driverSigninForm, 'Signing you in...');

      const email    = driverSigninForm.querySelector('[name="email"]').value.trim();
      const password = driverSigninForm.querySelector('[name="password"]').value;

      try {
        const res  = await fetch('/api/auth/driver-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || data.error || 'Sign in failed');

        GreenRoute.utils.setStorage(GreenRoute.storage.driverId, data.driverId);
        GreenRoute.utils.setStorage(GreenRoute.storage.userRole, 'driver');

        setNote(driverSigninForm, 'Signed in! Redirecting...');
        window.location.href = './driver.html';

      } catch (err) {
        setNote(driverSigninForm, err.message, true);
        setLoading(driverSigninForm, false);
      }
    });
  }

  // ─── Driver sign-up ───────────────────────────────────────────────────────
  const driverSignupForm = document.querySelector('[data-auth-form="driver-signup"]');
  if (driverSignupForm) {
    driverSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading(driverSignupForm, true);
      setNote(driverSignupForm, 'Creating your driver account...');

      const firstName    = driverSignupForm.querySelector('[name="firstName"]')?.value.trim();
      const lastName     = driverSignupForm.querySelector('[name="lastName"]')?.value.trim();
      const name         = firstName && lastName ? `${firstName} ${lastName}`.trim()
                         : driverSignupForm.querySelector('[name="name"]')?.value.trim();
      const email        = driverSignupForm.querySelector('[name="email"]').value.trim();
      const phone        = driverSignupForm.querySelector('[name="phone"]')?.value.trim();
      const password     = driverSignupForm.querySelector('[name="password"]').value;
      const confirmPassword = driverSignupForm.querySelector('[name="confirmPassword"]')?.value;
      const vehicleType  = driverSignupForm.querySelector('[name="vehicleType"]')?.value.trim();
      const licensePlate = driverSignupForm.querySelector('[name="vehiclePlate"]')?.value.trim()
                        || driverSignupForm.querySelector('[name="licensePlate"]')?.value.trim();
      const vehicleModel = driverSignupForm.querySelector('[name="vehicleModel"]')?.value.trim();

      if (confirmPassword !== undefined && password !== confirmPassword) {
        setNote(driverSignupForm, 'Passwords do not match', true);
        setLoading(driverSignupForm, false);
        return;
      }

      try {
        const res  = await fetch('/api/auth/driver-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password, vehicleType, licensePlate, vehicleModel })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || data.error || 'Sign up failed');

        GreenRoute.utils.setStorage(GreenRoute.storage.driverId, data.driverId);
        GreenRoute.utils.setStorage(GreenRoute.storage.userRole, 'driver');

        setNote(driverSignupForm, 'Account created! Redirecting...');
        window.location.href = './driver.html';

      } catch (err) {
        setNote(driverSignupForm, err.message, true);
        setLoading(driverSignupForm, false);
      }
    });
  }

})();