import type { VendorCategory } from "./categories";

const TEMPLATES: Record<VendorCategory, string[]> = {
  photographer: [
    "Où se passent les préparatifs ?",
    "À quelle heure commence la cérémonie ?",
    "Quels moments ne faut-il pas manquer ?",
    "Qui doit absolument être sur les photos de groupe ?",
  ],
  videographer: [
    "Où se passent les préparatifs ?",
    "À quelle heure commence la cérémonie ?",
    "Souhaitez-vous un discours filmé en entier ?",
    "Y a-t-il un lieu où le drone est interdit ?",
  ],
  dj: [
    "Quelle est la chanson de la première danse ?",
    "Quelles musiques faut-il éviter ?",
    "À quelle heure la soirée doit-elle se terminer ?",
  ],
  florist: [
    "Quelle palette de couleurs voulez-vous ?",
    "Où se déroule la cérémonie ?",
    "Le bouquet doit-il être gardé ou lancé ?",
  ],
  caterer: [
    "Combien d'adultes et d'enfants sont prévus ?",
    "Quels régimes ou allergies faut-il prévoir ?",
    "À quelle heure le dîner est-il servi ?",
  ],
  venue: [
    "À quelle heure pouvez-vous accéder au lieu ?",
    "Quelle est l'adresse de la cérémonie, et celle de la réception ?",
    "Qui est le contact sur place le jour J ?",
  ],
  planner: [
    "Qu'est-ce qui doit absolument bien se passer ?",
    "Qui prévenir en cas d'imprévu ?",
    "Qu'est-ce qui doit rester simple ?",
  ],
  beauty: [
    "À quelle heure commence le maquillage ?",
    "Où se passent les préparatifs ?",
    "Un essai a-t-il déjà eu lieu ?",
  ],
  hair: [
    "À quelle heure commence la coiffure ?",
    "Où se passent les préparatifs ?",
    "Un essai a-t-il déjà eu lieu ?",
  ],
  makeup: [
    "À quelle heure commence le maquillage ?",
    "Où se passent les préparatifs ?",
    "Un essai a-t-il déjà eu lieu ?",
  ],
  cake: [
    "Combien de parts faut-il prévoir ?",
    "Quelle palette de couleurs voulez-vous ?",
    "Où se déroule la réception ?",
  ],
  wine: [
    "Combien d'adultes sont prévus ?",
    "Quelles boissons faut-il prévoir ?",
    "À quelle heure le dîner est-il servi ?",
  ],
  animation: [
    "Quel moment de la journée faut-il animer ?",
    "Y a-t-il des enfants ?",
    "Où se déroule la réception ?",
  ],
  decor: [
    "Quelle palette de couleurs voulez-vous ?",
    "Où se déroule la réception ?",
    "À quelle heure pouvez-vous accéder au lieu ?",
  ],
  attire: [
    "Quelle palette de couleurs voulez-vous ?",
    "Quand a lieu l'essayage ?",
    "Combien de tenues faut-il prévoir ?",
  ],
  stationery: [
    "Quelle palette de couleurs voulez-vous ?",
    "Combien de faire-part faut-il prévoir ?",
    "Quelle est la date à faire figurer ?",
  ],
  transport: [
    "Où se déroule la cérémonie ?",
    "Où se déroule la réception ?",
    "À quelle heure commence la cérémonie ?",
  ],
  officiant: [
    "Comment vous êtes-vous rencontrés, en quelques lignes ?",
    "Y a-t-il une lecture prévue ?",
    "Les vœux sont-ils déjà écrits ?",
  ],
  other: [
    "Qu'attendez-vous de moi le jour J ?",
    "Quels sont les horaires à retenir ?",
    "Y a-t-il une contrainte du lieu ?",
  ],
};

export function questionTemplate(category: VendorCategory): string[] {
  return TEMPLATES[category];
}
