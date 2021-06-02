import { BigInt } from '@graphprotocol/graph-ts';
import { JurorSubscription, TopicCreation, PublicationSubmission, VoteCommitment, VoteReveal, Withdrawal } from '../generated/Protocol Ropsten V1/Protocol'
import { Publication, Topic, Juror, Voting, Vote } from '../generated/schema'

const zero = new BigInt(0);

export function handleTopicCreation(event: TopicCreation): void {
  let id = event.params._topicId.toString();
  let topic = new Topic(id);
  topic.priceToPublish = event.params._priceToPublish;
  topic.priceToBeJuror = event.params._priceToBeJuror;
  topic.authorReward = event.params._authorReward;
  topic.jurorReward = event.params._jurorReward;
  topic.commitPhaseDuration = event.params._commitPhaseDuration;
  topic.revealPhaseDuration = event.params._revealPhaseDuration;
  topic.jurorQuantity = zero;
  topic.save();
}

export function handleJurorSubscription(event: JurorSubscription): void {
  let id = event.params._juror.toString();
  let juror = Juror.load(id);
  if (juror == null) {
    juror = new Juror(id);
  }
  let topicId = event.params._topicId.toString();
  if (juror.topics.includes(topicId) && event.params._times === zero) {

  } else if (!juror.topics.includes(topicId) && event.params._times !== zero) {

  }
  juror.save();
}

export function handlePublicationSubmission(event: PublicationSubmission): void {
  // TODO!
}

export function handleVoteCommitment(event: VoteCommitment): void {
  // TODO!
}

export function handleVoteReveal(event: VoteReveal): void {
  // TODO!
}

export function handleWithdrawal(event: Withdrawal): void {
  // TODO!
}
