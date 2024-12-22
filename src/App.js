import React, { useState } from "react";
import "./App.css";

function App() {
  const [deck, setDeck] = useState(createDeck());
  const [players, setPlayers] = useState([]);
  const [playArea, setPlayArea] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [message, setMessage] = useState("");
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [numPlayers, setNumPlayers] = useState(0);
  const [revealedPlayers, setRevealedPlayers] = useState([]);

  React.useEffect(() => {
    if (numPlayers > 0) {
      let shuffledDeck = shuffleDeck([...deck]); // Shuffle the deck
      let threeOfClubsBurned = false;

      // If there are only 2 players, burn 25% of the deck
      if (numPlayers === 2) {
        const cardsToBurn = Math.floor(shuffledDeck.length * 0.25); // Calculate 25% of the deck
        const burnedCards = shuffledDeck.slice(0, cardsToBurn);
        threeOfClubsBurned = burnedCards.some((card) => card.value === "3" && card.suit === "♣");
        shuffledDeck = shuffledDeck.slice(cardsToBurn); // Remove the burned cards
        setMessage(`25% of the cards have been burned for a 2-player game! 🔥`);
      }

      const playerHands = [];
      const totalCards = shuffledDeck.length;

      // Deal cards evenly among players
      for (let i = 0; i < numPlayers; i++) {
        playerHands.push(sortCards(shuffledDeck.splice(0, Math.floor(totalCards / numPlayers))));
      }

      setPlayers(playerHands);

      // Determine the starting player
      const starter = findStartingPlayer(playerHands, threeOfClubsBurned);
      setCurrentPlayer(starter);

      // Initialize hidden state for all players
      setRevealedPlayers(Array(numPlayers).fill(false));
      setMessage(`Player ${starter + 1} starts the game!`);
    }
  }, [numPlayers]);


  function createDeck() {
    const suits = ["♠", "♥", "♣", "♦"];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
    const deck = [];
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }
    return deck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function sortCards(hand) {
    const ranks = {
      "3": 1,
      "4": 2,
      "5": 3,
      "6": 4,
      "7": 5,
      "8": 6,
      "9": 7,
      "10": 8,
      J: 9,
      Q: 10,
      K: 11,
      A: 12,
      "2": 13,
    };

    return hand.sort((a, b) => {
      const rankA = ranks[a.value];
      const rankB = ranks[b.value];
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.suit.localeCompare(b.suit);
    });
  }

  function findPlayerWithThreeOfClubs(playerHands) {
    for (let i = 0; i < playerHands.length; i++) {
      if (playerHands[i].some((card) => card.value === "3" && card.suit === "♣")) {
        return i;
      }
    }
    return 0;
  }

  function findStartingPlayer(playerHands, threeOfClubsBurned) {
    if (!threeOfClubsBurned) {
      // Find the player with the Three of Clubs
      for (let i = 0; i < playerHands.length; i++) {
        if (playerHands[i].some((card) => card.value === "3" && card.suit === "♣")) {
          return i;
        }
      }
    }

    // If Three of Clubs is burned, find the player with the lowest card with the highest frequency
    let lowestPlayerIndex = -1;
    let lowestCardRank = Infinity;
    let highestFrequency = 0;

    playerHands.forEach((hand, playerIndex) => {
      const rankCounts = {};
      hand.forEach((card) => {
        const rank = getCardRank(card.value);
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      const [lowestRank, frequency] = Object.entries(rankCounts)
          .sort(([rankA, freqA], [rankB, freqB]) => {
            if (freqA !== freqB) return freqB - freqA; // Higher frequency first
            return rankA - rankB; // Lower rank if frequencies are the same
          })[0];

      if (lowestRank < lowestCardRank || (lowestRank === lowestCardRank && frequency > highestFrequency)) {
        lowestPlayerIndex = playerIndex;
        lowestCardRank = parseInt(lowestRank, 10);
        highestFrequency = frequency;
      }
    });

    return lowestPlayerIndex;
  }

  function isValidPlay(selectedCards) {
    // Enforce that the first player must play first at the start of the game
    if (playArea.length === 0 && currentPlayer === findStartingPlayer(players, false)) {
      if (selectedCards.length === 0) {
        setMessage("The starting player must make the first move!");
        return false;
      }
    }

    const playType = getCombinationType(selectedCards);

    // Disallow invalid combinations
    if (playType === "invalid") {
      setMessage("Invalid play. Try a valid combination!");
      return false;
    }

    // Allow bombs but validate against the current bomb
    if (playType === "bomb") {
      if (playArea.length > 0 && getCombinationType(playArea) === "bomb") {
        const currentBombValue = getCardRank(playArea[0].value);
        const newBombValue = getCardRank(selectedCards[0].value);

        // Compare three-card bombs to four-card bombs
        const isFourCardBomb = selectedCards.length === 4;
        const isCurrentFourCardBomb = playArea.length === 4;

        if (!isFourCardBomb && isCurrentFourCardBomb) {
          setMessage("Your three-card bomb isn't strong enough to beat a four-card bomb! 💥");
          return false;
        }

        if (isFourCardBomb && !isCurrentFourCardBomb) {
          setMessage("BOOM! 🔥 A four-card bomb obliterates the three-card bomb!");
          return true;
        }

        // Compare bomb ranks if they are of the same size
        if (newBombValue < currentBombValue) {
          setMessage("Your bomb isn't strong enough! 💥");
          return false;
        }

        // If bomb values are equal, compare by the highest suit
        if (newBombValue === currentBombValue) {
          const currentBombSuit = getHighestSuit(playArea);
          const newBombSuit = getHighestSuit(selectedCards);

          if (newBombSuit <= currentBombSuit) {
            setMessage("Your bomb isn't strong enough! 💥");
            return false;
          }
        }
      }

      setMessage("BOOM! 🔥 What a play!");
      return true;
    }

    // If play area is empty, any valid combination can start
    if (playArea.length === 0) return true;

    // Validate play against the current play area
    const currentType = getCombinationType(playArea);

    if (playType === currentType) {
      if (playType === "straight") {
        return isValidStraight(playArea, selectedCards);
      }
      return comparePlays(playArea, selectedCards);
    }

    return false;
  }

  function getCombinationType(cards) {
    const ranks = cards.map((card) => card.value);
    const uniqueRanks = [...new Set(ranks)];

    // Single Card
    if (cards.length === 1) return "single";

    // Pair
    if (cards.length === 2 && uniqueRanks.length === 1) return "pair";

    // Straight
    if (cards.length >= 5) {
      const sortedRanks = ranks
          .map((rank) => getCardRank(rank))
          .sort((a, b) => a - b);
      const isConsecutive = sortedRanks.every((rank, i, arr) => {
        if (i === 0) return true;
        return rank - arr[i - 1] === 1;
      });
      if (isConsecutive) return "straight";
    }

    // Bomb (three or four of a kind)
    if ((cards.length === 3 || cards.length === 4) && uniqueRanks.length === 1) return "bomb";

    return "invalid";
  }

  function isValidStraight(currentStraight, newStraight) {
    const currentRank = getCardRank(currentStraight[0].value);
    const newRank = getCardRank(newStraight[0].value);

    if (newRank <= currentRank) return false;

    return newStraight.length >= currentStraight.length;
  }

  function comparePlays(current, next) {
    const currentValue = getCardRank(current[0].value);
    const nextValue = getCardRank(next[0].value);
    return nextValue > currentValue;
  }

  function getHighestSuit(cards) {
    const suitValues = {
      "♣": 1,
      "♦": 2,
      "♥": 3,
      "♠": 4,
    };

    return Math.max(...cards.map((card) => suitValues[card.suit]));
  }

  function getCardRank(value) {
    const ranks = {
      "3": 1,
      "4": 2,
      "5": 3,
      "6": 4,
      "7": 5,
      "8": 6,
      "9": 7,
      "10": 8,
      J: 9,
      Q: 10,
      K: 11,
      A: 12,
      "2": 13,
    };
    return ranks[value];
  }

  function playCard(playerIndex, selectedCards) {
    const hand = [...players[playerIndex]];

    if (!isValidPlay(selectedCards)) {
      return;
    }

    const updatedHand = hand.filter((card) => !selectedCards.includes(card));
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = sortCards(updatedHand);

    setPlayers(updatedPlayers);
    setPlayArea(selectedCards);
    setConsecutivePasses(0);
    setMessage("");
    switchPlayer();
  }

  function passTurn() {
    const newConsecutivePasses = consecutivePasses + 1;

    if (newConsecutivePasses >= players.length - 1) {
      setPlayArea([]);
      setMessage("All players passed. Play reset.");
      setConsecutivePasses(0);
    } else {
      setMessage("Player passed. Next player's turn.");
      setConsecutivePasses(newConsecutivePasses);
    }

    switchPlayer();
  }

  function switchPlayer() {
    setCurrentPlayer((currentPlayer + 1) % players.length);
    const updatedRevealed = Array(players.length).fill(false);
    setRevealedPlayers(updatedRevealed);
  }

  function resetGame() {
    setNumPlayers(0);
    setPlayers([]);
    setPlayArea([]);
    setCurrentPlayer(0);
    setConsecutivePasses(0);
    setMessage("");
  }

  function revealHand(playerIndex) {
    const updatedRevealed = [...revealedPlayers];
    updatedRevealed[playerIndex] = true;
    setRevealedPlayers(updatedRevealed);
  }

  if (numPlayers === 0) {
    return (
        <div className="App">
          <h1>Zheng Shangyou</h1>
          <p>How many players? (2-4)</p>
          {[2, 3, 4].map((n) => (
              <button key={n} onClick={() => setNumPlayers(n)}>
                {n} Players
              </button>
          ))}
        </div>
    );
  }

  return (
      <div className="App">
        <h1>Zheng Shangyou (Up to 4 Players)</h1>
        <div className="game-area">
          {players.map((hand, index) => (
              <Player
                  key={index}
                  name={`Player ${index + 1}`}
                  hand={hand}
                  playCard={(cards) => playCard(index, cards)}
                  passTurn={passTurn}
                  isTurn={currentPlayer === index}
                  isRevealed={revealedPlayers[index]}
                  revealHand={() => revealHand(index)}
              />
          ))}
        </div>
        <div className="play-area">
          <h3>Play Area</h3>
          <div className="cards">
            {playArea.map((card, index) => (
                <Card key={index} card={card} />
            ))}
          </div>
        </div>
        <button onClick={resetGame}>Reset Game</button>
        <p className="message">{message}</p>
      </div>
  );
}

function Player({ name, hand, playCard, passTurn, isTurn, isRevealed, revealHand }) {
  const [selectedCards, setSelectedCards] = useState([]);

  function toggleCardSelection(card) {
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter((c) => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  }

  function handlePlay() {
    playCard(selectedCards);
    setSelectedCards([]);
  }

  return (
      <div className={`player ${isTurn ? "active" : ""}`}>
        <h2>{name}</h2>
        <div className="hand">
          {!isRevealed
              ? hand.map((_, index) => <div key={index} className="card hidden" />)
              : hand.map((card, index) => (
                  <Card
                      key={index}
                      card={card}
                      onClick={() => toggleCardSelection(card)}
                      isSelected={selectedCards.includes(card)}
                  />
              ))}
        </div>
        {isTurn && !isRevealed && <button onClick={revealHand}>Show My Cards</button>}
        {isTurn && isRevealed && (
            <div>
              <button onClick={handlePlay} disabled={selectedCards.length === 0}>
                Play
              </button>
              <button onClick={passTurn}>Pass</button>
            </div>
        )}
      </div>
  );
}

function Card({ card, onClick, isSelected }) {
  return (
      <div className={`card ${isSelected ? "selected" : ""}`} onClick={onClick}>
        {`${card.value}${card.suit}`}
      </div>
  );
}

function PlayArea({ playArea }) {
  return (
      <div className="play-area">
        <h3>Play Area</h3>
        <div className="cards">
          {playArea.map((card, index) => (
              <Card key={index} card={card} />
          ))}
        </div>
      </div>
  );
}

export default App;
