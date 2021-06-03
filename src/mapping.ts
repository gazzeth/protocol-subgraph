import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
  TopicCreation,
  JurorSubscription as JurorTopicSubscription,
  PublicationSubmission,
  VoteCommitment,
  VoteReveal,
  Withdrawal
} from '../generated/Protocol Ropsten V0/Protocol';
import { Protocol } from '../generated/Protocol Ropsten V0/Protocol';
import { Publication, Voting, Vote, Topic, Juror, JurorSubscription } from '../generated/schema';

enum VoteValue {
  NONE = 0,
  TRUE = 1,
  FALSE = 2,
  UNQUALIFIED = 3,
}

const PROTOCOL_ADDRESS = Address.bind("0x92Fba6413071183583a1d6125656D04437b1320f");
const PROTOCOL = Protocol.bind(PROTOCOL_ADDRESS);
const ZERO_BIG_INT = BigInt.fromI32(0);
const ONE_BIG_INT = BigInt.fromI32(1);

export function handleTopicCreation(event: TopicCreation): void {
  let topic = new Topic(event.params._topicId.toString());
  topic.priceToPublish = event.params._priceToPublish;
  topic.priceToBeJuror = event.params._priceToBeJuror;
  topic.authorReward = event.params._authorReward;
  topic.jurorReward = event.params._jurorReward;
  topic.commitPhaseDuration = event.params._commitPhaseDuration;
  topic.revealPhaseDuration = event.params._revealPhaseDuration;
  // topic.jurorQuantity = ZERO_BIG_INT;
  topic.selectableJurorsQuantity = ZERO_BIG_INT;
  topic.save();
}

export function handleJurorSubscription(event: JurorTopicSubscription): void {
  let jurorId = event.params._juror.toHexString();
  let juror = Juror.load(jurorId);
  if (juror == null) {
    juror = new Juror(jurorId);
  }
  let topicId = event.params._topicId.toString();
  let jurorSubscriptionId = getJurorSubscriptionId(jurorId, topicId);
  let jurorSubscription = JurorSubscription.load(jurorSubscriptionId);
  if (jurorSubscription == null) {
    jurorSubscription = new JurorSubscription(jurorSubscriptionId);
    jurorSubscription.juror = jurorId;
    jurorSubscription.topic = event.params._topicId.toString();
  }
  jurorSubscription.times = event.params._times;
  jurorSubscription.save();
  let topic = Topic.load(topicId);
  topic.selectableJurorsQuantity = BigInt.fromI32(PROTOCOL.getSelectableJurors(topic.id).length);
  topic.save();
}

export function handlePublicationSubmission(event: PublicationSubmission): void {
  let publicationId = event.params._publicationId.toHexString();
  let publication = new Publication(publicationId);
  publication.hash = event.params._hash;
  publication.author = event.params._author.toHexString();
  publication.topic = event.params._topicId.toString();
  publication.publishDate = event.params._publishDate;
  publication.voting = publicationId;
  publication.save();
  let voting = new Voting(publicationId);
  voting.publication = publicationId;
  voting.withdrawn = false;
  voting.voteCounters = [ZERO_BIG_INT, ZERO_BIG_INT, ZERO_BIG_INT, ZERO_BIG_INT];
  voting.winningVote = VoteValue.NONE;
  event.params._jurors.forEach(jurorAddress => {
    let jurorId = jurorAddress.toHexString();
    voting.jurors.push(jurorId);
    let vote = new Vote(getVoteId(jurorId, publicationId));
    vote.voting = publicationId;
    vote.juror = jurorId;
    vote.value = VoteValue.NONE;
    vote.penalized = false;
    vote.save();
  });
  voting.save();
  let topic = Topic.load(event.params._topicId.toString());
  topic.selectableJurorsQuantity = BigInt.fromI32(PROTOCOL.getSelectableJurors(topic.id).length);
  topic.save();
}

export function handleVoteCommitment(event: VoteCommitment): void {
  let voteId = getVoteId(event.params._juror.toHexString(), event.params._publicationId.toHexString());
  let vote = Vote.load(voteId);
  vote.commitment = event.params._commitment.toHexString();
  vote.save();
}

export function handleVoteReveal(event: VoteReveal): void {
  let voteId = getVoteId(event.params._juror.toHexString(), event.params._publicationId.toHexString());
  let vote = Vote.load(voteId);
  vote.value = event.params._voteValue;
  vote.justification = event.params._justification;
  vote.penalized = event.params._voteValue == 0;
  vote.save();
  let voting = Voting.load(event.params._publicationId.toHexString());
  voting.voteCounters = event.params._voteCounters;
  voting.winningVote = event.params._winningVote;
  voting.save();
}

export function handleWithdrawal(event: Withdrawal): void {
  let voting = Voting.load(event.params._publicationId.toHexString());
  voting.withdrawn = true;
  voting.save();
  let publication = Publication.load(event.params._publicationId.toHexString());
  let topic = Topic.load(publication.topic);
  topic.selectableJurorsQuantity = BigInt.fromI32(PROTOCOL.getSelectableJurors(topic.id).length);
  topic.save();
  voting.jurors.forEach(jurorId => {
    let jurorSubscription = JurorSubscription.load(getJurorSubscriptionId(jurorId, topic.id));
    let jurorVote = Vote.load(getVoteId(jurorId, publication.id));
    if (!jurorWasRewarded(voting, jurorVote) && jurorSubscription.times !== ZERO_BIG_INT) {
      jurorSubscription.times = jurorSubscription.times.minus(ONE_BIG_INT);
      jurorSubscription.save();
    }
  });
}

function jurorWasRewarded(voting: Voting, jurorVote: Vote): boolean {
  return jurorVote.value !== VoteValue.NONE && voting.winningVote === jurorVote.value;
}

function getVoteId(jurorId: string, publicationId: string): string {
  return `${jurorId}@${publicationId}`;
}

function getJurorSubscriptionId(jurorId: string, topicId: string): string {
  return `${jurorId}@${topicId}`;
}
