/*
 * Dans Profile.tsx actuel, supprimer complètement l'import Coins.
 *
 * AVANT :
 *   ArrowLeft, UserCircle, Mail, Coins, LogOut,
 *
 * APRÈS :
 *   ArrowLeft, UserCircle, Mail, LogOut,
 *
 * ----------------------------------------------------------------
 * Supprimer également entièrement ce bloc :
 * ----------------------------------------------------------------
 *
 * <div className="p-4 flex items-center justify-between">
 *   <div className="flex items-center gap-3">
 *     <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
 *       <Coins className="w-4 h-4 text-yellow-400" />
 *     </div>
 *     <div>
 *       <p className="text-xs text-muted-foreground">Solde de Coins</p>
 *       <p className="text-lg font-bold text-green-400">{user.txCoins} Coins</p>
 *     </div>
 *   </div>
 *   <Button
 *     size="sm"
 *     onClick={() => navigateWithLoader("/topup")}
 *     className="bg-green-600 hover:bg-green-700 text-white"
 *   >
 *     Recharger
 *   </Button>
 * </div>
 *
 * ----------------------------------------------------------------
 * Et remplacer le texte de suppression du compte :
 * ----------------------------------------------------------------
 *
 * AVANT :
 *   Cela supprime définitivement votre compte, les métadonnées
 *   de vos bots, et votre solde. Cette action est irréversible.
 *
 * APRÈS :
 *   Cela supprime définitivement votre compte et les métadonnées
 *   de vos bots. Cette action est irréversible.
 *
 * ----------------------------------------------------------------
 * IMPORTANT :
 * ----------------------------------------------------------------
 *
 * Ne supprime PAS :
 *   - useCurrency
 *   - la sélection de devise
 *   - le thème
 *   - le changement de nom
 *   - le lien de parrainage
 *   - la suppression du compte
 *   - refreshUser
 *
 * La devise peut rester dans le profil pour les informations
 * internationales, mais elle ne doit plus être utilisée pour
 * calculer ou afficher un prix de service.
 */
