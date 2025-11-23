# Sui Origin Story Segments

## Page 1
1. How It All Began
In 2021, five engineers walked away from Facebook — a company with unlimited resources — to chase a vision the world had never seen before.
They believed developers deserved a blockchain that could scale to billions of users, one that moved at the speed of the internet itself. Their mission wasn't just to build another chain, but to unlock the real potential of Web3 through technology with unmatched speed, efficiency, and security.
This is the story behind Sui — and how you can build the next generation of apps on it.

## Page 2
5. Death on the Hill
Mark Zuckerberg once defended Facebook's Libra project on Capitol Hill.
He endured hours of grilling as politicians mocked the idea as "Zuck Bucks."
Despite his belief in the mission, the pressure became unbearable.
Facebook shut the project down.
But the world didn't magically change. Billions of people still lived without fast, stable, digital money. The very problem Libra tried to solve remained unsolved.

## Page 3
6. The Phoenix Rises From the Ashes
When Facebook killed Libra/Diem, the project may have died — but the ideas didn't.
The engineers who built it had created groundbreaking technology:
• a brand-new programming language (Move)
• a new virtual machine
• a radically scalable digital asset architecture
They realized this technology wasn't just good for payments.
It could transform gaming.
It could transform social.
It could transform finance.
The worst outcome would be letting this innovation sit on a shelf, forgotten.

## Page 4
7. Enter the Fantastic Five
Instead of copying Ethereum or chasing hype, the five engineers built something brand new.
They resurrected the original vision — but amplified it.
• Libra/Diem was for payments → Sui is for everything
• Libra/Diem was permissioned → Sui is permissionless
• Libra/Diem was closed → Sui is open to all builders
Just as Tim Berners-Lee opened the web to the world, Sui aims to open the next technological era.

## Page 5
8. What's Wrong With the Web Today
The modern internet has quietly turned into a digital kingdom where:
• platforms take almost all creator revenue
• social networks lock users inside walled gardens
• in-game items worth billions vanish outside their ecosystems
The web became closed again — not by governments this time, but by corporations.

## Page 6
9. Fixing the Web
Now imagine a world where:
• creators keep most of what they earn
• you can bring your social graph anywhere
• digital items have real value across apps and games
That's the world Sui wants to create.

## Page 7
11. Rome Wasn't Built in a Day
The engineers could have forked Ethereum and called it a day.
But Sam Blackshear, the creator of Move, knew better:
the language itself is one of the largest sources of bugs.
They realized that truly world-changing tech required:
1. A new blockchain
2. A new language
3. A stronger team
Anything less would only copy the past — not build the future.

## Page 8
12. The Challenges Ahead
The team faced two categories of problems:
Blockchain-centric issues
• slow execution
• low scalability
• high fees
• sequential bottlenecks
Language-centric issues
• smart-contract bugs
• poor safety guarantees
• vulnerabilities caused by accidental developer mistakes
To build Web3 safely, they had to solve both.

## Page 9
13. Why This Distinction Matters
Blockchains rarely get hacked.
Smart contracts do.
There is always a gap between:
• what developers mean
• and what the language actually expresses
That tiny gap has cost billions.

## Page 10
14. Users Don't Care About These Distinctions
When someone loses money, they don't care whether the failure came from:
• the blockchain
or
• the smart contract
Loss is loss.
The Fantastic Five internalized this — and designed Sui + Move to eliminate these issues at the root.

## Page 11
15. Embracing the Distinction
Instead of blending blockchain and language problems together, the team separated them — and solved each individually.
Since most hacks originate in smart contracts, they began with the language.

## Page 12
16. Starting with the Language
Bugs happen when code fails to capture what the developer truly intended.
Zuckerberg once said:
"Code always does exactly what you tell it to do."
Sam Blackshear had analyzed thousands of Facebook bugs. His insight:
many weren't human error — they were flaws in the language itself.
This led to the birth of Move.

## Page 13
18. Baking in Safety
Programmers aren't careless.
But when you write enough code, bugs become inevitable.
Move's core principle became:
the language must be safe by default.
Sam pointed to big blockchain disasters to show why.

## Page 14
19. Cautionary Tales
The classic example:
The DAO hack, June 17, 2016
• 3.6M ETH stolen (~$7B in 2023)
• Ethereum was forced to hard-fork
All because of one subtle bug in a single smart contract.

## Page 15
20. "Catch Me If You Can"
A simplified vulnerable contract:
contract Vulnerable {
    mapping (address => uint) private balances;
    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success);
        balances[msg.sender] = 0;
    }
}
The bug?
It's hidden — but deadly.

## Page 16
21. The Re-Entrancy Attack
The flaw is simple:
The contract sends ETH before resetting the balance.
A hacker can call the contract repeatedly during the withdrawal — draining all funds.
This single mistake changed blockchain history.

## Page 17
23. Enter Sui
This isn't a hacking contest — it's a lesson.
Sui + Move combine:
• strict typing
• object-centric architecture
• granular state control
• formal verification (Move Prover)
These guardrails make re-entrancy and many other common vulnerabilities impossible by design.
Move also dramatically reduces audit costs — a bonus for real-world developers.
Rust developers? They'll feel right at home.

## Page 18
24. Write Less Code
Research shows an average of 20 bugs per 1,000 lines of code.
So the solution is simple:
Write less code.
But Solidity lacks:
• a modern package manager
• safe code reuse
• modular composition
So developers copy-paste.
And every vulnerability spreads like a virus.
Move fixes this with:
• native packages
• upgradeability
• reusability
• shared libraries ("fix once, update everywhere")

## Page 19
25. Synergy: 1 + 1 = 3
Move solved language problems.
But when Move runs on Sui, it also solves blockchain problems.
A key limitation of blockchains is:
sequential execution → congestion → high gas
A few thousand NFT mints can freeze a whole chain.
This kills mass adoption.

## Page 20
26. The Language Makes the Execution Fast
Because Move is object-centric and strongly typed, Sui can analyze transaction dependencies before execution.
If two transactions don't touch the same objects →
they run in parallel.
This is the foundation for Sui's massive throughput.
It's not just fast infrastructure —
it's the synergy of language + blockchain.

## Page 21
27. What Can Sui Do?
Sui isn't built for a single purpose.
Just like the early internet, it's a foundation for anything.
It empowers developers to build without the limits of performance, security, or cost.
Sui is uniquely positioned to power the next era of:
• DeFi
• Gaming
• Social applications
• High-performance digital experiences

