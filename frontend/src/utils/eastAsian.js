// Écritures d'Asie de l'Est. Un nom écrit en chinois, japonais ou coréen se dit nom de famille d'abord, et n'a
// pas d'initiales (voir initial.js et personName.js). Les caractères Han seuls servent au prénom chinois.
export const EAST_ASIAN = /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u
export const HAN = /\p{Script=Han}/u
