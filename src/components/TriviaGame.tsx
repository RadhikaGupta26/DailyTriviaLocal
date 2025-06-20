import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TriviaData {
  id: string;
  question: string;
  answer: string;
  acceptedAnswers: string[]; // New field for alternate correct answers
  hints: string[];
}

const TriviaGame = () => {
  const [guessesLeft, setGuessesLeft] = useState(5);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [revealedHints, setRevealedHints] = useState<boolean[]>([false, false, false]);
  const [submittedGuesses, setSubmittedGuesses] = useState<string[]>([]);
  const [dailyStreak, setDailyStreak] = useState(0);

  const triviaData: TriviaData = {
    id: "2025-06-19", // CHANGE THIS DAILY
    question: "every man in this movie is the literal definition of suave.",
    answer: "Ocean's Eleven",
    acceptedAnswers: [
      "ocean's eleven", "oceans eleven", "ocean's 11", "oceans 11"
    ],
    hints: [
      "Genre: Comedy/Crime",
      "Released in the 2000s", 
      "as a kid I straight up thought I could do this, this was my preferred career path"
    ]
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const storageKey = `triviaGame_${triviaData.id}_${currentDate}`;

  useEffect(() => {
    const savedStreak = localStorage.getItem('dailyTriviaStreak');
    const savedGameState = localStorage.getItem(storageKey);

    if (savedStreak) setDailyStreak(parseInt(savedStreak));
    if (savedGameState) {
      const gameState = JSON.parse(savedGameState);
      setGuessesLeft(gameState.guessesLeft);
      setGameStatus(gameState.gameStatus);
      setRevealedHints(gameState.revealedHints);
      setSubmittedGuesses(gameState.submittedGuesses);

      // 🔁 June 19 fix — grant win retroactively if the answer was actually correct
      if (
        triviaData.id === '2025-06-19' &&
        gameState.gameStatus === 'lost' &&
        gameState.submittedGuesses?.some((g: string) =>
          triviaData.acceptedAnswers.includes(g.toLowerCase().trim())
        )
      ) {
        setGameStatus('won');
        const newStreak = (parseInt(savedStreak ?? '0') || 0) + 1;
        setDailyStreak(newStreak);
        localStorage.setItem('dailyTriviaStreak', newStreak.toString());
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...gameState,
            gameStatus: 'won',
          })
        );
      }
    }
  }, [currentDate, storageKey, triviaData]);

  useEffect(() => {
    const gameState = {
      guessesLeft,
      gameStatus,
      revealedHints,
      submittedGuesses
    };
    localStorage.setItem(storageKey, JSON.stringify(gameState));
  }, [guessesLeft, gameStatus, revealedHints, submittedGuesses, storageKey]);

  const handleSubmitGuess = () => {
    if (!currentGuess.trim() || gameStatus !== 'playing') return;

    const guess = currentGuess.trim().toLowerCase();
    const newSubmittedGuesses = [...submittedGuesses, currentGuess];
    setSubmittedGuesses(newSubmittedGuesses);

    // ✅ Send to Google Sheets
    fetch('https://script.google.com/macros/s/AKfycbxBXTPGqytozxAScX0ZmEgcz9zO1hNBtfn2G5w8jCJk4uCjj3HOqysJVArrrmffmnqw/exec', {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        puzzleId: triviaData.id,
        guess: currentGuess.trim(),
      }),
    });

    const isCorrect = triviaData.acceptedAnswers.includes(guess);

    if (isCorrect) {
      setGameStatus('won');
      const newStreak = dailyStreak + 1;
      setDailyStreak(newStreak);
      localStorage.setItem('dailyTriviaStreak', newStreak.toString());
    } else {
      const newGuessesLeft = guessesLeft - 1;
      setGuessesLeft(newGuessesLeft);

      if (newGuessesLeft === 0) {
        setGameStatus('lost');
        setDailyStreak(0);
        localStorage.setItem('dailyTriviaStreak', '0');
      }
    }

    setCurrentGuess('');
  };

  const handleRevealHint = (hintIndex: number) => {
    const newRevealedHints = [...revealedHints];
    newRevealedHints[hintIndex] = true;
    setRevealedHints(newRevealedHints);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitGuess();
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-gotham-bold text-black mb-4">
            Guess the movie from an incredibly random out-of-context movie review.
          </h1>
          <h2 className="text-xl font-gotham-medium text-black mb-2">
            Date: {currentDate}
          </h2>
          <div className="text-lg font-gotham-medium text-black">
            Daily Questions Correct: {dailyStreak}
          </div>
        </div>

        <div className="border-2 border-black rounded-2xl p-6">
          <p className="text-lg font-gotham-bold text-black leading-relaxed">
            {triviaData.question}
          </p>
        </div>

        <div className="border-2 border-black rounded-2xl p-6">
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="answer is typed here"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={gameStatus !== 'playing'}
              className="text-center font-gotham-medium text-black placeholder:text-gray-500 border-0 shadow-none text-lg focus-visible:ring-0"
            />
            
            {gameStatus === 'playing' && (
              <div className="flex justify-between items-center text-sm font-gotham-medium text-gray-600">
                <span>Guesses left: {guessesLeft}</span>
                <Button 
                  onClick={handleSubmitGuess}
                  disabled={!currentGuess.trim()}
                  className="bg-black text-white hover:bg-gray-800 font-gotham-medium"
                >
                  Submit
                </Button>
              </div>
            )}
          </div>
        </div>

        {gameStatus === 'won' && (
          <div className="text-center space-y-2">
            <p className="text-2xl font-gotham-bold text-success">You got it!</p>
            <p className="font-gotham-medium text-black">Come back tomorrow for a new puzzle!</p>
          </div>
        )}

        {gameStatus === 'lost' && (
          <div className="text-center space-y-2">
            <p className="text-xl font-gotham-bold text-red-600">Game Over!</p>
            <p className="font-gotham-medium text-black">
              The answer was: <span className="font-gotham-bold">{triviaData.answer}</span>
            </p>
            <p className="font-gotham-medium text-black">Come back tomorrow for a new puzzle!</p>
          </div>
        )}

        {submittedGuesses.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-gotham-medium text-black">Your guesses:</h3>
            <div className="space-y-1">
              {submittedGuesses.map((guess, index) => (
                <p key={index} className="font-gotham-medium text-gray-600 pl-4">
                  {index + 1}. {guess}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {triviaData.hints.map((hint, index) => (
            <div key={index} className="border-2 border-black rounded-2xl p-6">
              {revealedHints[index] ? (
                <p className="font-gotham-medium text-black leading-relaxed">
                  {hint}
                </p>
              ) : (
                <div className="text-center">
                  <Button
                    onClick={() => handleRevealHint(index)}
                    className="bg-white text-black border-2 border-black hover:bg-gray-50 font-gotham-medium min-h-10 h-auto py-2 px-4 whitespace-normal text-center leading-tight"
                    disabled={gameStatus !== 'playing'}
                  >
                    {index === 2
                      ? "Radhika's hint (only helpful if you know this specific Radhika, very unhelpful if you know any other Radhika)"
                      : `Hint ${index + 1}`}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TriviaGame;
