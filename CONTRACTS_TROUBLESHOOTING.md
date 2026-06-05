# Freelancer Contracts Screen - Troubleshooting Guide

## ❓ Why don't I see the Contracts screen?

### Checklist

#### 1. **Are you logged in?**
- [ ] Check browser console for user session
- [ ] Should see `AppProvider` user context
- [ ] Login at `/auth/login` if needed

#### 2. **Is your user role set to Freelancer?**
```typescript
// Check in browser console:
console.log(user?.role);
// Should be: 1 (Freelancer) or UserRole.Freelancer
```

**Roles in GigBridge:**
- `0` = Client
- `1` = Freelancer  
- `2` = Admin

#### 3. **Have you completed setup?**
- [ ] The route requires `requireSetup: true`
- [ ] You must have completed user setup/onboarding
- [ ] If not completed, you'll be redirected to setup

#### 4. **Have you reloaded the app?**
- [ ] After code changes, the app may need rebuild
- [ ] Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- [ ] Check that `freelancer-contract-screen.css` is loaded

#### 5. **Check the route is registered**
In browser DevTools - Network tab, you should see:
- Route `/contracts` responds
- CSS files are loaded
- No JavaScript errors in Console

---

## 🔍 How to Access the Contracts Screen

### Via Sidebar (Recommended)
1. Login as Freelancer
2. Look for "Contracts" in left sidebar
3. Click on it → Navigate to `/contracts`

### Direct URL
Type in browser address bar:
```
http://localhost:3000/contracts
```

### Programmatically
```typescript
navigate('/contracts');
```

---

## 📋 Expected Screen Layout

When you access `/contracts`, you should see:

```
┌─────────────────────────────────────────┐
│ My Contracts                             │
│ Track your contracts and submit...       │
├─────────────────────────────────────────┤
│ [Active: 2] [Total: $50K] [Completed: 1]│
├─────────────────────────────────────────┤
│ 🔍 Search...              [Filter ▼]    │
├─────────────────────────────────────────┤
│                                          │
│  📋 Contract 1 - Status Badge            │
│  ├─ Client: Acme Corp                   │
│  ├─ Budget: $10,000                     │
│  ├─ Start: Jan 1, 2024                  │
│  └─ [View] [Expand ▼]                   │
│                                          │
│  📋 Contract 2 - Status Badge            │
│  ├─ Client: Tech Startup                │
│  ├─ Budget: $15,000                     │
│  ├─ Start: Feb 15, 2024                 │
│  └─ [View] [Expand ▼]                   │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🐛 Common Issues & Fixes

### Issue: "Page not found" or blank screen

**Solution:**
1. Check if `/contracts` route is in `router.tsx` ✅ (Line 176)
2. Verify `FreelancerContractScreen` is exported from `contracts/index.ts` ✅
3. Check `AppProvider` context has `role` property ✅

### Issue: "I see the sidebar link but can't click it"

**Solution:**
1. You may not be authenticated → Login first
2. You may not have completed setup → Complete onboarding
3. Hard refresh browser: `Ctrl+Shift+R`

### Issue: "Sidebar shows 'Contracts' but says I'm not freelancer"

**Solution:**
1. Logout and login again with freelancer account
2. Check `user.role` in browser console
3. If role is 0 (Client), you'll see different contracts screen (`ManageContractScreen`)

### Issue: "CSS styles not showing"

**Solution:**
1. Check if `freelancer-contract-screen.css` is imported in component
2. Verify file path: `../styles/freelancer-contract-screen.css`
3. Clear browser cache: `Ctrl+F5`
4. Check DevTools - Styles tab to see if CSS is loaded

### Issue: "Data not loading - showing empty state"

**Solution:**
1. Check network tab - is API call happening?
2. If API fails, mock data (`MOCK_CONTRACTS_FOR_SCREENS`) should load
3. Check browser console for errors
4. Verify `contractGetAPI.getMyContracts()` is available

---

## 🚀 Quick Setup for Testing

### Step 1: Login as Freelancer
```
URL: http://localhost:3000/auth/login
Email: freelancer@test.com (or any freelancer account)
Password: [enter password]
```

### Step 2: Navigate to Contracts
- Click "Contracts" in sidebar OR
- Type `/contracts` in URL

### Step 3: Verify Display
You should see:
- ✅ Header with "My Contracts"
- ✅ Quick stats (3 cards)
- ✅ Search bar
- ✅ Filter button
- ✅ Contract list (or empty state)

---

## 🔧 Developer Debugging

### Check User Context
```typescript
// In browser console:
// Should print user role
const getUser = () => {
  // Access via React DevTools extension
  // Or check localStorage
  console.log(localStorage.getItem('user'));
}
```

### Check Route Is Active
```typescript
// Should print current route
console.log(window.location.pathname);
// Should be: /contracts
```

### Check CSS Variables
```typescript
// In console:
const style = getComputedStyle(document.body);
console.log(style.getPropertyValue('--accent-primary'));
// Should output: #0077FF
```

### Check Component Rendered
```typescript
// In console, check if component exists
console.log(document.querySelector('.freelancer-contract-wrapper'));
// Should return: <div class="freelancer-contract-wrapper">...</div>
```

---

## ✅ Verification Checklist

- [ ] Logged in as Freelancer (role = 1)
- [ ] User setup completed
- [ ] Sidebar shows "Contracts" link
- [ ] Can navigate to `/contracts`
- [ ] Header displays "My Contracts"
- [ ] Quick stats cards visible
- [ ] Search/filter working
- [ ] Contract list displays (or empty state)
- [ ] Can expand contracts
- [ ] CSS styles applied (cyan color, spacing)
- [ ] Animations working smoothly

---

## 📞 Need Help?

If screen still doesn't show:

1. **Check browser console for errors** - Most issues logged there
2. **Verify role:** `console.log(user?.role)` should be `1`
3. **Check route:** URL should be `localhost:3000/contracts`
4. **Clear cache:** `Ctrl+Shift+R` (hard refresh)
5. **Rebuild app:** If using dev server, restart it

---

## 🎯 Next Steps After Seeing Contracts

Once you see the screen:
1. Search for contracts
2. Filter by status
3. Click "Expand" to see milestones
4. Click "View Details" for full contract view
5. Try "Submit Deliverable" on active milestones
6. Test responsive design (resize window)

---

**Last Updated:** June 2026  
**Relevant Files:**
- `FreelancerContractScreen.tsx` - Main component
- `freelancer-contract-screen.css` - Styling
- `router.tsx` - Route configuration
- `Sidebar.tsx` - Navigation link
