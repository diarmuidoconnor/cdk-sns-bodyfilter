

aws s3 cp test.txt s3://a-bucket/test.txt --metadata '{"x-amz-meta-cms-id":"34533452"}'

$ aws s3 cp ./images/sunflower.jpeg  s3://edastack-images9bf4dcd5-x0garyoits9v/image1.jpeg

aws s3api delete-object --bucket edastack-images9bf4dcd5-1xwb81w15o6oe --key image1.jpeg
