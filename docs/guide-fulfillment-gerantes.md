# Guide — Gestion des Fulfillments
**Pour les gérantes de boutique Mood Collection**

---

## À quoi sert cette page ?

La page Fulfillment permet de consulter et modifier le statut d'expédition (fulfillment) de chaque produit d'une commande Shopify. Elle est utile lorsqu'une commande a été marquée comme expédiée par erreur, ou au contraire qu'un produit doit être manuellement confirmé comme envoyé.

---

## Accès

1. Ouvrir `https://katana-scanner-mvp.vercel.app/fulfillment` dans un navigateur
2. Se connecter avec ton adresse Google `@yourmood.net`
3. La page s'ouvre directement

---

## Rechercher une commande

Dans le champ de recherche, saisir le **numéro de commande** (sans ou avec le `#`) :

```
392523   ou   #392523
```

Cliquer sur **Charger**. La liste des produits de la commande s'affiche.

---

## Comprendre les statuts

| Statut | Signification |
|---|---|
| **Fulfillé** (vert) | Le produit a été marqué comme expédié dans Shopify |
| **Non fulfillé** (gris) | Le produit n'a pas encore été marqué comme expédié |
| **Partiel** (jaune) | Une partie de la quantité a été expédiée |

---

## Modifier le statut d'un produit

### Annuler un fulfillment (Unfulfill)

> Utiliser lorsqu'un produit a été marqué expédié **par erreur**.

1. Repérer le produit avec le statut **Fulfillé**
2. Cliquer sur le bouton rouge **Unfulfill**
3. Confirmer — le statut passe à **Non fulfillé**

**Important :** Si la commande contient le tag `en production`, le tag `ATTENTION-ERREUR-FULFILL-POS-A-REIMPRIMER` est automatiquement ajouté à la commande dans Shopify. Cela signale à l'équipe logistique que les bons de préparation (POS) doivent être réimprimés.

### Confirmer un fulfillment (Fulfill)

> Utiliser lorsqu'un produit doit être manuellement marqué comme expédié.

1. Repérer le produit avec le statut **Non fulfillé**
2. Cliquer sur le bouton vert **Fulfill**
3. Le statut passe à **Fulfillé**

---

## Le tag ATTENTION-ERREUR-FULFILL-POS-A-REIMPRIMER

Quand ce tag apparaît sur la commande (visible dans l'en-tête de la page ou directement dans Shopify), cela signifie :

- Un fulfillment a été annulé sur une commande **en cours de production**
- Les bons de préparation imprimés ne sont **plus valides**
- Il faut **réimprimer les POS** avant de traiter la commande

---

## Questions fréquentes

**Je ne vois pas de bouton Unfulfill / Fulfill sur un produit.**
Le produit a peut-être un statut particulier (partiel, remis en stock) qui nécessite une action directement dans Shopify.

**J'ai fait une erreur de manipulation.**
Refaire l'opération inverse (Fulfill après un Unfulfill ou inversement) remet le statut à son état précédent. Si le tag ATTENTION a été ajouté, le supprimer manuellement dans Shopify une fois les POS réimprimés.

**La commande n'est pas trouvée.**
Vérifier que le numéro est correct dans Shopify. Les commandes annulées ou archivées peuvent ne pas apparaître.

---

*Document interne Mood Collection — usage réservé à l'équipe*
