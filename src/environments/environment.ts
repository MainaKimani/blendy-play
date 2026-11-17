/**
 * Build-time settings, compiled into the app. Unlike config.json this is not fetched at runtime,
 * so the trivia answers don't show up as a request in the network tab. They are still in the
 * JavaScript bundle; the trivia is a game, not a lock.
 */

export interface TriviaQuestion {
  q: string;
  /** Four choices. The page shuffles them before showing. */
  options: [string, string, string, string];
  /** Index into options of the right answer. */
  answer: number;
}

export const environment = {
  /** Film and TV questions for the countdown. Three are picked at random per attempt. */
  trivia: [
    { q: 'Which film won Best Picture at the 2020 Oscars?', options: ['Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'], answer: 0 },
    { q: 'Who directed Jaws (1975)?', options: ['Steven Spielberg', 'George Lucas', 'Martin Scorsese', 'Francis Ford Coppola'], answer: 0 },
    { q: "Lupita Nyong'o won her Oscar for which film?", options: ['12 Years a Slave', 'Black Panther', 'Us', 'Queen of Katwe'], answer: 0 },
    { q: "In The Lion King, what is Simba's father called?", options: ['Mufasa', 'Scar', 'Rafiki', 'Zazu'], answer: 0 },
    { q: 'What is the name of the African nation in Black Panther?', options: ['Wakanda', 'Zamunda', 'Genovia', 'Latveria'], answer: 0 },
    { q: 'The kingdom of Zamunda comes from which film?', options: ['Coming to America', 'Black Panther', 'The Lion King', 'Hotel Rwanda'], answer: 0 },
    { q: 'Who played Jack in Titanic (1997)?', options: ['Leonardo DiCaprio', 'Brad Pitt', 'Matt Damon', 'Johnny Depp'], answer: 0 },
    { q: 'Which series is set in the land of Westeros?', options: ['Game of Thrones', 'The Witcher', 'Vikings', 'The Last Kingdom'], answer: 0 },
    { q: "What is Walter White's alias in Breaking Bad?", options: ['Heisenberg', 'Saul', 'Gus', 'The Professor'], answer: 0 },
    { q: 'Which series features a dark mirror world called the Upside Down?', options: ['Stranger Things', 'Dark', 'Wednesday', 'Lost'], answer: 0 },
    { q: 'What is the original Spanish title of Money Heist?', options: ['La casa de papel', 'El juego del calamar', 'Élite', 'Narcos'], answer: 0 },
    { q: 'Squid Game comes from which country?', options: ['South Korea', 'Japan', 'China', 'Thailand'], answer: 0 },
    { q: "Which character did Lupita Nyong'o play in Black Panther?", options: ['Nakia', 'Okoye', 'Shuri', 'Ramonda'], answer: 0 },
    { q: 'What is the name of the cowboy in Toy Story?', options: ['Woody', 'Buzz', 'Jessie', 'Rex'], answer: 0 },
    { q: '"May the Force be with you" comes from which franchise?', options: ['Star Wars', 'Star Trek', 'Dune', 'The Matrix'], answer: 0 },
    { q: 'Who played Iron Man in the Marvel films?', options: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], answer: 0 },
    { q: 'In The Matrix, which pill does Neo take?', options: ['Red', 'Blue', 'Green', 'White'], answer: 0 },
    { q: 'Which Hogwarts house is Harry Potter in?', options: ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'], answer: 0 },
    { q: 'What is the family name in The Godfather?', options: ['Corleone', 'Soprano', 'Montana', 'Gambino'], answer: 0 },
    { q: 'Who directed Inception?', options: ['Christopher Nolan', 'Denis Villeneuve', 'Ridley Scott', 'David Fincher'], answer: 0 },
    { q: 'What is the coffee shop called in Friends?', options: ['Central Perk', "Monk's Café", 'The Grind', 'Java Joe'], answer: 0 },
    { q: 'Which paper company is The Office (US) set in?', options: ['Dunder Mifflin', 'Wernham Hogg', 'Sabre', 'Staples'], answer: 0 },
    { q: 'What kind of fish is Nemo?', options: ['Clownfish', 'Blue tang', 'Goldfish', 'Angelfish'], answer: 0 },
    { q: "What is the name of Elsa's sister in Frozen?", options: ['Anna', 'Ariel', 'Belle', 'Aurora'], answer: 0 },
    { q: 'Which film has the line "I\'ll be back"?', options: ['The Terminator', 'Rambo', 'Die Hard', 'Predator'], answer: 0 },
    { q: "What is the name of Shrek's wife?", options: ['Fiona', 'Rapunzel', 'Cinderella', 'Dragon'], answer: 0 },
    { q: 'Nollywood is the film industry of which country?', options: ['Nigeria', 'Ghana', 'Kenya', 'South Africa'], answer: 0 },
    { q: 'Bollywood is based mainly in which city?', options: ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'], answer: 0 },
    { q: 'In Forrest Gump, "Life is like a box of…"', options: ['chocolates', 'surprises', 'matches', 'memories'], answer: 0 },
    { q: "What is James Bond's code number?", options: ['007', '001', '009', '700'], answer: 0 },
    { q: 'Who played the Joker in The Dark Knight (2008)?', options: ['Heath Ledger', 'Joaquin Phoenix', 'Jared Leto', 'Jack Nicholson'], answer: 0 },
    { q: "Who plays Sherlock in the BBC's Sherlock?", options: ['Benedict Cumberbatch', 'Martin Freeman', 'Tom Hiddleston', 'Robert Pattinson'], answer: 0 },
    { q: "Which Pixar film takes place inside a girl's mind?", options: ['Inside Out', 'Soul', 'Coco', 'Up'], answer: 0 },
    { q: "What is Vin Diesel's character called in Fast & Furious?", options: ['Dominic Toretto', "Brian O'Conner", 'Luke Hobbs', 'Deckard Shaw'], answer: 0 },
    { q: 'Money Heist opens with a raid on the Royal Mint in which city?', options: ['Madrid', 'Barcelona', 'Lisbon', 'Seville'], answer: 0 },
    { q: 'Which Disney film has the song "Hakuna Matata"?', options: ['The Lion King', 'Aladdin', 'The Jungle Book', 'Tarzan'], answer: 0 },
    { q: 'In which film is a boy stranded on a lifeboat with a tiger?', options: ['Life of Pi', 'Cast Away', 'The Jungle Book', 'Kon-Tiki'], answer: 0 },
    { q: 'Who starred as Maximus in Gladiator (2000)?', options: ['Russell Crowe', 'Mel Gibson', 'Gerard Butler', 'Brad Pitt'], answer: 0 },
    { q: "Who played T'Challa in Black Panther (2018)?", options: ['Chadwick Boseman', 'Michael B. Jordan', 'Daniel Kaluuya', 'Winston Duke'], answer: 0 },
    { q: 'Wednesday belongs to which family?', options: ['Addams', 'Munster', 'Simpson', 'Belcher'], answer: 0 },
    { q: 'The Crown follows the reign of which monarch?', options: ['Queen Elizabeth II', 'Queen Victoria', 'King Charles III', 'King George VI'], answer: 0 },
    { q: 'Which Avengers villain wipes out half of all life with a snap?', options: ['Thanos', 'Ultron', 'Loki', 'Red Skull'], answer: 0 },
    { q: 'Queen of Katwe is set in which country?', options: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda'], answer: 0 },
    { q: 'Which streaming service made Stranger Things?', options: ['Netflix', 'Prime Video', 'Disney+', 'HBO'], answer: 0 },
    { q: 'Who plays Mr. Bean?', options: ['Rowan Atkinson', 'Hugh Laurie', 'Ricky Gervais', 'John Cleese'], answer: 0 },
    { q: 'In The Lord of the Rings, where must the One Ring be destroyed?', options: ['Mount Doom', 'Rivendell', 'Isengard', 'Minas Tirith'], answer: 0 },
    { q: "What is Spider-Man's real name?", options: ['Peter Parker', 'Bruce Wayne', 'Clark Kent', 'Tony Stark'], answer: 0 },
    { q: "What is Superman's home planet?", options: ['Krypton', 'Asgard', 'Titan', 'Vulcan'], answer: 0 },
    { q: 'Who directed Titanic (1997)?', options: ['James Cameron', 'Steven Spielberg', 'Ridley Scott', 'Peter Jackson'], answer: 0 },
    { q: 'Who is the Minions\' boss in Despicable Me?', options: ['Gru', 'Vector', 'Dr. Nefario', 'Scarlet'], answer: 0 },
    { q: 'What is the panda called in Kung Fu Panda?', options: ['Po', 'Tai Lung', 'Shifu', 'Mantis'], answer: 0 },
    { q: 'Which demigod sails with Moana?', options: ['Maui', 'Tamatoa', 'Hercules', 'Kakamora'], answer: 0 },
    { q: 'Which Game of Thrones prequel follows House Targaryen?', options: ['House of the Dragon', 'The Rings of Power', 'Shōgun', 'The Witcher: Blood Origin'], answer: 0 },
    { q: 'Who directed Pulp Fiction?', options: ['Quentin Tarantino', 'Guy Ritchie', 'Martin Scorsese', 'the Coen brothers'], answer: 0 },
    { q: 'In Harry Potter, what is the name of Harry\'s owl?', options: ['Hedwig', 'Errol', 'Crookshanks', 'Fawkes'], answer: 0 },
    { q: 'Which film features the DeLorean time machine?', options: ['Back to the Future', 'The Terminator', 'Looper', 'Interstellar'], answer: 0 },
    { q: 'What is the name of the snowman in Frozen?', options: ['Olaf', 'Sven', 'Kristoff', 'Hans'], answer: 0 },
    { q: 'Who plays Jack Sparrow in Pirates of the Caribbean?', options: ['Johnny Depp', 'Orlando Bloom', 'Javier Bardem', 'Geoffrey Rush'], answer: 0 },
    { q: 'Which animated film is set during the Mexican Day of the Dead?', options: ['Coco', 'Encanto', 'Ratatouille', 'Luca'], answer: 0 },
    { q: 'In Avatar (2009), what is the name of the moon where the Na\'vi live?', options: ['Pandora', 'Arrakis', 'Endor', 'Naboo'], answer: 0 },
  ] satisfies TriviaQuestion[] as TriviaQuestion[],
};
