# VOW

VOW est l'espace partagé entre un prestataire de mariage et ses couples. Le premier métier visé est la photographie, mais le compte prestataire couvre aussi DJ, fleuriste, traiteur, lieu, wedding planner et beauté.

Un prestataire publie une vitrine, crée un mariage, et invite le couple par un lien lié à son e-mail. Les deux retrouvent ensuite, pour ce mariage seulement :

- une conversation en temps réel ;
- des documents ;
- le déroulé du jour, modifiable par les prestataires, lisible et commentable par le couple.

Il n'y a pas de code d'accès commun. L'accès repose sur Supabase Auth (e-mail + mot de passe, ou lien magique) et sur les politiques de sécurité des lignes.

Hors périmètre pour l'instant : budget, liste d'invités, plan de table, playlist, IA, paiements, annuaire.

## Prérequis

- Node.js 22
- un projet Supabase (local avec le CLI, ou le projet cloud `vow-mvp`)

## Variables d'environnement

Copier `.env.example` vers `.env.local`.

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet. Local : `http://127.0.0.1:54321`. Cloud : `https://hwrcmkvfuytviixqibzo.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable (anon). L'ancien nom `NEXT_PUBLIC_SUPABASE_ANON_KEY` est encore lu. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, uniquement pour `npm run seed`. Jamais dans le navigateur. |
| `NEXT_PUBLIC_SITE_URL` | Origine publique du site, sans slash final. Sert aux liens d'invitation et aux redirections d'auth. |

## Base de données

Migrations, dans cet ordre, sur un projet vide :

1. `supabase/migrations/20261110180000_init.sql`
2. `supabase/migrations/20261110210000_practical.sql` — infos pratiques, photos de groupe, invités, et le mode Jour J (décalages, alertes, abonnements push)
3. `supabase/migrations/20261110230000_spaces.sql` — métiers (vidéaste, officiant), fiches visibles par métier (`can_see_sheet`), et Jour J réservé au couple (`shift_timeline_slot`, `post_wedding_alert`)
4. `supabase/migrations/20261110233000_shell.sql` — coquille globale (préférences d'alertes, logo), et le mariage démo isolé (`open_couple_demo`, `leave_couple_preview`, `delete_couple_demo`). Un prestataire ne devient couple que sur ce mariage démo.
5. `supabase/migrations/20261110240000_day_tools.sql` — demandes de devis (`leads`, `submit_quote_request`), modèles de déroulé (le couple les applique, le prestataire les suggère), rappels J-60/J-30/J-14 (`run_due_reminders`) et signatures électroniques simples (`signature_requests`, `record_signature`). L'insertion et la modification de `timeline_slots` sont réservées au couple, y compris via `is_wedding_couple` pour l'essai démo.

Le mode Jour J met à jour le déroulé en direct. Le fil d'alertes et le toast fonctionnent sans configuration. Les notifications du téléphone demandent une paire de clés VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) et la clé `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement. Sans ces variables, VOW reste sur le fil dans l'application.

Les fonctions serveur Vercel sont épinglées sur Paris (`cdg1` dans `vercel.json`), à côté du projet Supabase `eu-west-3`.

Un cron Vercel, une fois par jour à 06:00 UTC (`/api/cron/reminders`), crée les rappels dans l'application. Le plan Hobby n'autorise qu'une exécution quotidienne. Le travail est idempotent : chaque manque n'est rappelé qu'une fois par palier (J-60, J-30, J-14). Aucun secret n'est requis pour ce chemin. Le canal e-mail existe derrière `src/server/mail.ts` et reste éteint : `emailChannelEnabled()` renvoie toujours faux, aucun prestataire n'est appelé.

Il crée les tables, les fonctions (`create_wedding`, `create_invitation`, `accept_invitation`, `preview_invitation`), active la RLS sur chaque table, ajoute `messages` à la publication temps réel, et crée les buckets Storage.

### Local

```bash
npx supabase start
npx supabase migration up
```

`supabase/config.toml` désactive la confirmation d'e-mail en local pour que les tests puissent créer un compte sans boîte mail. Les e-mails partent vers Mailpit : `http://127.0.0.1:54324`.

Le fichier `supabase/seed.sql` est volontairement vide : le seed passe par l'API Admin, qui reste compatible avec le schéma Auth.

```bash
npm run seed
```

Comptes de démonstration (mot de passe `DemoVow2026!`) :

- prestataire photographe : `camille@demo.vow.test`
- traiteur : `nina@demo.vow.test`
- couple : `lea@demo.vow.test`

Ne lancez pas ce seed sur un projet public : le mot de passe est connu.

### Projet cloud `vow-mvp`

Référence : `hwrcmkvfuytviixqibzo`, région `eu-west-3`.

```bash
npx supabase link --project-ref hwrcmkvfuytviixqibzo
npx supabase db push
```

Ou, dans le SQL Editor du dashboard, coller les fichiers dans l'ordre ci-dessus, chacun une seule fois. `20261110233000_shell.sql` n'est pas encore appliqué sur `vow-mvp`.

Les buckets `vendor-media` (public) et `wedding-documents` (privé) sont créés par la migration. Vérifiez-les dans Storage après l'application. Aucune création manuelle n'est nécessaire si la migration passe.

### Auth à régler dans le dashboard

Authentication → URL Configuration :

- Site URL : `http://127.0.0.1:3000` en local, puis l'URL Vercel en production.
- Redirect URLs :
  - `http://127.0.0.1:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/confirm`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://<domaine-vercel>/auth/callback`
  - `https://<domaine-vercel>/auth/confirm`

Authentication → Providers : e-mail activé. En production, laissez la confirmation d'e-mail activée : l'application gère `/auth/callback` (code PKCE) et `/auth/confirm` (`token_hash`). Les modèles d'e-mail par défaut, qui utilisent `{{ .ConfirmationURL }}`, conviennent tant que l'URL de redirection est autorisée.

Mot de passe minimum recommandé : 8 caractères. Le formulaire le vérifie déjà.

La connexion commence par un code à 6 chiffres (`signInWithOtp`). Le lien reçu dans le même e-mail ouvre aussi la session. Le mot de passe reste disponible. `Continuer avec Google` et `Continuer avec Apple` ne s'affichent que si `NEXT_PUBLIC_AUTH_GOOGLE` ou `NEXT_PUBLIC_AUTH_APPLE` vaut `true`, et les fournisseurs doivent être activés dans Supabase. En local, le modèle `supabase/templates/magic_link.html` contient le code.

## Lancer l'application

```bash
npm install
npm run dev
```

Ouvrir `http://127.0.0.1:3000`.

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Le parcours de bout en bout (inscription prestataire, vitrine, mariage, invitation, arrivée du couple, messages, déroulé, document) :

```bash
npx playwright install chromium
npm run test:e2e
```

Il faut un Supabase local déjà démarré, avec les variables dans `.env.local`. Le test crée ses propres comptes, il ne dépend pas du seed.

## Déployer sur Vercel

1. Pousser ce dépôt et l'importer dans Vercel. Framework : Next.js. Aucune commande de build particulière.
2. Renseigner les quatre variables d'environnement (la clé service role seulement si vous exécutez le seed depuis un environnement de confiance ; l'application en ligne n'en a pas besoin).
3. Déployer.
4. Revenir dans Supabase et ajouter l'URL Vercel comme Site URL et dans les Redirect URLs, comme ci-dessus.
5. Appliquer la migration si ce n'est pas déjà fait.

## Ce que la sécurité couvre

- Chaque table `public` a la RLS activée. Un membre ne lit que les mariages auxquels il appartient.
- Le décalage du jour J (`shift_timeline_slot`) et l'alerte (`post_wedding_alert`) exigent `is_wedding_couple`. Un prestataire lit le déroulé, il ne le décale pas.
- `is_demo` et `couple_preview` ne se changent pas par un update direct. Seul `open_couple_demo` les pose, et seulement sur le mariage d'essai du prestataire. Un mariage client ne peut pas être basculé en couple.
- `can_see_sheet` limite les photos de groupe au couple, au photographe, au vidéaste et au wedding planner, et les invités (tables, régimes) au couple, au traiteur, au lieu et au wedding planner. Les autres métiers voient les adresses, pas ces listes.
- La création d'un mariage et l'acceptation d'une invitation passent par des fonctions qui vérifient le rôle du compte. Il n'existe pas de code prestataire en dur.
- L'invitation n'est acceptée que si l'e-mail du compte connecté est celui de l'invitation, et si le rôle (couple ou prestataire) correspond.
- `vendor-media` est un bucket public pour que la vitrine publiée s'affiche sans clé secrète. Les noms de fichiers sont des identifiants aléatoires. `wedding-documents` reste privé : le téléchargement passe par une URL signée, après contrôle d'appartenance au mariage.
