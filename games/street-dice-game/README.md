# Cheesborough Street Craps

Cheesborough Street Craps is a local, two-dice game with a 3D dice tray, Three.js rendering, and Cannon-es physics. It is a virtual-chip interpretation for play and learning; it does not process money, payments, or cash transactions.

## Rules implemented

Choose a Pass or Don't Pass line bet and enter a whole-chip wager no larger than the active shooter's balance.

- On the come-out roll, Pass wins on 7 or 11 and loses on 2, 3, or 12. Don't Pass wins on 2 or 3, loses on 7 or 11, and pushes on 12.
- A come-out 4, 5, 6, 8, 9, or 10 establishes the point.
- With a point active, rolling the point settles Pass as a win and Don't Pass as a loss. Rolling 7 settles Pass as a loss and Don't Pass as a win. Every other total is no decision and the shooter rolls again.
- Winning bets add an equal amount to the balance; losing bets subtract the wager; pushes leave the balance unchanged. Every player begins with 1,000 virtual chips.
- A seven-out passes the shooter position to the next local player, wrapping after the last player. Other resolved rounds keep the same shooter, an intentional street-game rotation rule.

## Play

1. Serve the folder with `python server.py`, then visit the local address it prints.
2. Choose one to seven players and give each player a name.
3. Select Pass or Don't Pass, enter a wager (or use a quick bet), then roll both dice.
4. Use **New Round** only after a resolved result. **Return to Menu** keeps the game saved; **Resume Game** restores it.

The interface saves player names, balances, records, shooter, wager, point, history, and round state in `localStorage`.

## Technology credits

This project uses [Three.js](https://threejs.org/) and [Cannon-es](https://pmndrs.github.io/cannon-es/). Its 3D dice setup is adapted from the [Three.js Rolling Dice Tutorial](https://github.com/uuuulala/Threejs-rolling-dice-tutorial/) and retains the included dice model. The project remains licensed under the included MIT License.

## Responsible play

This game uses virtual chips for entertainment and educational purposes only. No real-money wagering is offered. Unlicensed street gambling may violate state or local law. Know the rules where you live.
