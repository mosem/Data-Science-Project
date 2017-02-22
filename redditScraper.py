import praw
import datetime
import json

client_id_str = 'vJpj1KFoozVc_A'
client_secret_str = 'YR9SRuIqLVxBm7uNaZiGM60Jylw'

reddit = praw.Reddit(user_agent='Comment Extraction (by /u/mosma)',
                     client_id=client_id_str, client_secret=client_secret_str)
def extract_subreddit(subreddit_str = 'politics', output_filename = 'out.json'):
    subreddit = praw.models.Subreddit(reddit,subreddit_str)
    submissions = subreddit.top(time_filter = 'day')
    submissions_list = []
    for submission in submissions:
        submission.comments.replace_more()
        url = "http://www.reddit.com" + submission.permalink
        title = submission.title
        author = str(submission.author)
        time = str(datetime.datetime.fromtimestamp(submission.created))
        link = submission.url
        num_comments = submission.num_comments
        comments = [{'author':str(comment.author),'id':comment.id,
                     'parent_id':comment.parent_id,'body':str(comment.body),
                     'score':comment.score} for comment in submission.comments.list()]
        submission_dict = {'url':url,'title':title,'author':author,'time':time,'link':link,'num_comments':num_comments,'comments':comments}
        submissions_list.append(submission_dict)
    json_obj = json.dumps(submissions_list,indent = 4,separators=(',', ': '))
    with open(subreddit_str + '_' + output_filename,'w') as outfile:
        json.dump(submissions_list,outfile,indent = 4,separators=(',', ': '))
    return json_obj

extract_subreddit('books')
    
