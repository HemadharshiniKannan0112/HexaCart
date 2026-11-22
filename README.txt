HEXACART | FIREBASE + FIRESTORE + POSTMAN
========================================

This is a browser-based online shopping assignment. Azure is not used.
The project uses HTML, CSS, JavaScript, jQuery, Firebase Authentication,
Cloud Firestore. Product images are stored as HTTPS image URLs. Postman requests are included.

IMPORTANT SECURITY NOTES
------------------------
- Never publish account passwords in JavaScript, Postman exports, GitHub,
  screenshots or README files. Enter passwords only in Firebase Console,
  Postman local environment values, or the sign-in screen.
- The Firebase Web API key is a client identifier, not an admin credential.
  Firestore and Storage rules enforce access. Keep rules deployed and tested.
- The admin UID in the app and rules is the UID supplied for this project.
  If the admin account is recreated, update ADMIN_UID in both files/rules.
- Do not commit service-account JSON files or private server credentials.
- The included REST client is suitable for this assignment/demo. For a
  production commerce system, move checkout, credit accounting, sequential ID
  allocation and privileged operations into trusted Cloud Functions or a
  server using the Firebase Admin SDK. Client-side rules alone cannot provide
  a complete payment-grade order validation workflow.

1. FIREBASE CONSOLE SETUP
-------------------------
A. Open https://console.firebase.google.com/ and select hexacart-b7f3f.
B. Authentication > Sign-in method: enable Email/Password.
C. Authentication > Users: confirm the administrator user exists and its UID
   is YPa3iN00v4YOZFS9Gle8xkqyAH33. Add the customer test account if required.
   Passwords are deliberately not stored in this project.
D. Build > Firestore Database: create the database in the required region.
E. Firebase Storage is not required. This project uses externally hosted HTTPS image URLs.
F. Project settings > General > Your apps: confirm the Web API key.

2. CONFIGURE THE APPLICATION
----------------------------
Open hexacart-firestore-api.js. Confirm these values:
  PROJECT: hexacart-b7f3f
  KEY: your Firebase Web API key
  ADMIN_UID: YPa3iN00v4YOZFS9Gle8xkqyAH33
  ADMIN: hemadharshini.kannan@psiog.com
  Product images: paste a publicly accessible HTTPS image URL in the admin product form
The admin password is never required in this file.

3. DEPLOY FIRESTORE RULES
-------------------------------------
Install Node.js LTS and Firebase CLI:
  npm install -g firebase-tools
  firebase login
From this HexaCart folder:
  firebase use --add
  (select hexacart-b7f3f)
  firebase deploy --only firestore:rules
Review the deployed rules in Firebase Console. The rules are intentionally
restricted to the configured administrator UID for admin writes.

4. SEED THE DEMO CATALOGUE
--------------------------
Run a local server from this folder, for example with VS Code Live Server.
Open api-test.html, sign in with the admin account, then run the seed action
once. It creates four categories and twelve demo products (with local image
assets). Do not run seed repeatedly on a live catalogue unless you intend to
replace those sample documents.

5. RUN THE WEBSITE
------------------
Open index.html through Live Server, not file://.
Sign in as admin to open Inventory, Customer Credit and Reports.
Sign up or sign in as a customer to browse, add items, checkout and view orders.
New product IDs are generated as p013, p014, ... (continuing from the highest p-number already in Firestore) based on the highest existing
P-number and are used as the Firestore document IDs. Existing legacy IDs such
as p001 are left unchanged. Avoid simultaneous product creation from multiple
admin sessions in this assignment version.

6. PRODUCT IMAGES
-----------------
In Admin > Inventory > New item/Edit item:
- Choose a local JPG, PNG, WEBP or GIF file (up to 5 MB), OR
- Paste an HTTPS image URL.
The local file is uploaded to Firebase Storage and its download URL is saved
in the Firestore product document as imageUrl. URL images are saved directly.
Storage must be enabled and STORAGE_BUCKET must be configured. Storage rules
allow public image reads and admin-only image writes.

7. EMAIL CONFIGURATION
----------------------
Password reset: Firebase Authentication sends the reset email. In Firebase
Console > Authentication > Templates, customise the Password reset template
and authorised domains if necessary.

Order bill email: configure EmailJS (or replace it with your organisation's
approved email service). In hexacart-firestore-api.js fill:
  EMAILJS.service  = EmailJS Service ID
  EMAILJS.template = EmailJS Template ID
  EMAILJS.key      = EmailJS public key
Create a template with these variables:
  {{to_email}}, {{to_name}}, {{order_id}}, {{total}}, {{lines}}
The current app displays the bill even if EmailJS is not configured. EmailJS
credentials are not included; bill email delivery is not active until setup
and a real inbox test succeeds. Never place a private email-service secret in
browser code.

8. POSTMAN
-----------
Import both files from postman/:
  HexaCart.postman_collection.json
  HexaCart.postman_environment.json
Select the HexaCart Firebase environment. Enter adminPassword and
customerPassword locally in the environment editor (do not export/share those
values). Run Admin sign in first; the response script saves idToken. Then run
category/product requests. For customer profile/orders, run Customer sign in
first so idToken and customerUid are replaced with the customer's values.
The Postman Create product request uses a sample document ID P9000. Change it
before use if that ID already exists. The website's automatic product-ID
sequence is generated in the app; Postman requests intentionally use explicit
IDs so that API testing is deterministic.

9. GITHUB PUSH
--------------
Create an empty GitHub repository named HexaCart. In terminal, from this folder:
  git init
  git add .
  git commit -m "Complete HexaCart Firebase shopping application"
  git branch -M main
  git remote add origin https://github.com/YOUR-USERNAME/HexaCart.git
  git push -u origin main
Replace YOUR-USERNAME with your GitHub username. If origin already exists:
  git remote set-url origin https://github.com/YOUR-USERNAME/HexaCart.git
Before pushing, check that no passwords, service-account JSON files, private
keys or personal tokens are present. The .gitignore excludes common secrets.

10. FINAL TEST CHECKLIST
------------------------
[ ] Admin UID matches the UID in Firebase Authentication.
[ ] Email/Password provider enabled; Firestore enabled.
[ ] Firestore rules deployed.
[ ] Admin sign-in works; customer cannot open Admin screens.
[ ] Customer signup creates a profile with creditLimit = 0.
[ ] Password reset email arrives and link works.
[ ] Category, product list, search and pagination work.
[ ] Admin creates a product; generated ID matches Firestore document ID.
[ ] Admin edits, activates/deactivates and deletes a product.
[ ] Local image upload and HTTPS image URL both display after refresh.
[ ] Customer adds products, changes quantities and checks out with cash.
[ ] Credit checkout succeeds only within assigned credit limit.
[ ] Order history and bill display correctly.
[ ] EmailJS bill email arrives (only after configuration).
[ ] Admin can update/reset customer credit limits.
[ ] Customer, inventory and sales reports return expected data.
[ ] Warm and Dark themes work and persist after refresh.
[ ] Postman admin/customer auth and Firestore requests return expected status.
[ ] Unauthorised admin writes are rejected by Firestore rules.

ASSIGNMENT INTERPRETATION
-------------------------
The assignment PDF specifies default customer Credit Limit = 0 and also
mentions a 1000 credit amount in the purchase description. This implementation
uses the explicit default of 0; an admin can assign a limit. Confirm with the
trainer if 1000 is intended as a universal default.

The assignment asks for customer, inventory and sales reports, including
customer top 10, cash/credit purchases, category stock, high/low stock,
category/cash/credit sales and top/bottom 10 selling items. These report views
are present in the Admin > Reports area.

This package is source code and setup material. It cannot be truthfully called
live-tested against your Firebase project until you deploy the rules, configure
image URLs/email and run the checklist using your accounts.
