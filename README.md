# Experiment Helper

```
/*
要求ハードリソース
  memory (s_vmem): 20G = ジョブは 1 スロットあたり 20G バイトのメモリを要求します
  slots (def_slot): 3 = ジョブは 300% の CPU を要求します
  total memory: 60G = ジョブは 60G バイトのメモリを要求します
Your job 114087714 ("start_jupyter.sh") has been submitted
*/
/*
[yjyu@pmg04 scseq-code]$ qstat -j 114087714
==============================================================
job_number:                 114087714
jclass:                     NONE
exec_file:                  job_scripts/114087714
submission_time:            06/13/2025 19:45:36.060
owner:                      yjyu
uid:                        17295
group:                      hgc0693
gid:                        10693
supplementary group:        hgc0693
sge_o_home:                 /home/yjyu
sge_o_log_name:             yjyu
sge_o_path:                 /home/yjyu/my_python_builds/bin:/home/yjyu/r-contents/r-install/bin:/home/geadmin/N1GE/bin/lx-amd64:/rshare1/ZETTAI_path_WA_slash_home_KARA/home/yjyu/.vscode-server/cli/servers/Stable-dfaf44141ea9deb3b4096f7cd6d24e00c147a4b1/server/bin/remote-cli:/home/geadmin/N1GE/bin/lx-amd64:/home/geadmin/N1GE/bin/lx-amd64:/usr/local/package/virtuoso/7.2.11/bin:/usr/local/package/ruby/3.2.2/bin:/usr/local/package/r/4.3.2/bin:/usr/local/package/python/3.12.0/bin:/usr/local/package/protobuf/25.2/bin:/usr/local/package/postgresql/16.1/bin:/usr/local/package/perl/5.38.2/bin:/usr/local/package/octave/8.4.0/bin:/usr/local/package/nano/7.2/bin:/usr/local/package/mysql/8.0.35/bin:/usr/local/package/mongodb/7.0.3/bin:/usr/local/package/lua/5.4.6/bin:/usr/local/package/llvm/17.0.4/bin:/usr/local/package/java/17.0.9.8.1/bin:/usr/local/package/haskell/8.4.3/bin:/usr/local/package/go/1.21.3/bin:/usr/local/package/git/2.43.0/bin:/usr/local/package/gcc/13.2.0/bin:/usr/local/package/ant/1.10.14/bin:/usr/local/hgc/bin:/usr/share/Modules/bin:/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/yjyu/.vscode-server/extensions/ms-python.debugpy-2025.8.0-linux-x64/bundled/scripts/noConfigScripts
sge_o_shell:                /bin/bash
sge_o_workdir:              /rshare1/ZETTAI_path_WA_slash_home_KARA/home/yjyu/scseq-code
sge_o_host:                 pmg04i
account:                    sge
cwd:                        /home/yjyu/scseq-code
stderr_path_list:           NONE:NONE:scripts/start_jupyter_e.txt
hard_resource_list:         mem_req=20G,s_vmem=20G
mail_list:                  yjyu@pmg04i
notify:                     FALSE
job_name:                   start_jupyter.sh
stdout_path_list:           NONE:NONE:scripts/start_jupyter_o.txt
priority:                   0
jobshare:                   0
shell_list:                 NONE:/bin/bash
env_list:                   LD_LIBRARY_PATH=/usr/local/package/ruby/3.2.2/lib:/usr/local/package/r/4.3.2/lib64/R/lib:/usr/local/package/python/3.12.0/lib:/usr/local/package/postgresql/16.1/lib:/usr/local/package/mysql/8.0.35/lib:/usr/local/package/lua/5.4.6/lib:/usr/local/package/llvm/17.0.4/lib:/usr/local/package/gcc/13.2.0/lib64:/usr/local/package/gcc/13.2.0/lib:/usr/local/lib64:/usr/local/lib
script_file:                scripts/start_jupyter.sh
parallel environment:       def_slot range: 3
department:                 defaultdepartment
binding:                    NONE
mbind:                      NONE
submit_cmd:                 orgqsub -hard -l mem_req=20G scripts/start_jupyter.sh
category_id:                7842
request_dispatch_info:      FALSE
start_time            1:    06/13/2025 19:46:27.525
job_state             1:    r
exec_host_list        1:    pc049i:3
granted_req.          1,0:  mem_req=20.000G
granted_req.          1,1:  mem_req=20.000G
granted_req.          1,2:  mem_req=20.000G
usage                 1:    wallclock=00:00:00, cpu=00:00:00, mem=0.00000 GBs, io=0.00000 GB, iow=0.000 s, ioops=0, vmem=N/A, maxvmem=N/A, rss=N/A, maxrss=N/A
gpu_usage             1:    NONE
cgroups_usage         1:    NONE
scheduling info:            -
*/
/*
[yjyu@pmg04 scseq-code]$ qdel 114087714
yjyu has registered the job 114087714 for deletion
*/
/*
[yjyu@pmg04 scseq-code]$ qstat
job-ID     prior   name       user         state submit/start at     queue                          jclass                         slots ja-task-ID 
------------------------------------------------------------------------------------------------------------------------------------------------
 114089757 0.50334 start_jupy yjyu         qw    06/13/2025 21:10:35                                                                   3        
 114089774 0.00000 start_jupy yjyu         qw    06/13/2025 21:11:27                                                                   3 
*/
/*
[yjyu@pmg04 scseq-code]$ qstat -j 114089799
==============================================================
job_number:                 114089799
jclass:                     NONE
exec_file:                  job_scripts/114089799
submission_time:            06/13/2025 21:12:30.025
owner:                      yjyu
uid:                        17295
group:                      hgc0693
gid:                        10693
supplementary group:        hgc0693
sge_o_home:                 /home/yjyu
sge_o_log_name:             yjyu
sge_o_path:                 /home/yjyu/my_python_builds/bin:/home/yjyu/r-contents/r-install/bin:/home/geadmin/N1GE/bin/lx-amd64:/rshare1/ZETTAI_path_WA_slash_home_KARA/home/yjyu/.vscode-server/cli/servers/Stable-dfaf44141ea9deb3b4096f7cd6d24e00c147a4b1/server/bin/remote-cli:/home/geadmin/N1GE/bin/lx-amd64:/home/geadmin/N1GE/bin/lx-amd64:/usr/local/package/virtuoso/7.2.11/bin:/usr/local/package/ruby/3.2.2/bin:/usr/local/package/r/4.3.2/bin:/usr/local/package/python/3.12.0/bin:/usr/local/package/protobuf/25.2/bin:/usr/local/package/postgresql/16.1/bin:/usr/local/package/perl/5.38.2/bin:/usr/local/package/octave/8.4.0/bin:/usr/local/package/nano/7.2/bin:/usr/local/package/mysql/8.0.35/bin:/usr/local/package/mongodb/7.0.3/bin:/usr/local/package/lua/5.4.6/bin:/usr/local/package/llvm/17.0.4/bin:/usr/local/package/java/17.0.9.8.1/bin:/usr/local/package/haskell/8.4.3/bin:/usr/local/package/go/1.21.3/bin:/usr/local/package/git/2.43.0/bin:/usr/local/package/gcc/13.2.0/bin:/usr/local/package/ant/1.10.14/bin:/usr/local/hgc/bin:/usr/share/Modules/bin:/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/yjyu/.vscode-server/extensions/ms-python.debugpy-2025.8.0-linux-x64/bundled/scripts/noConfigScripts
sge_o_shell:                /bin/bash
sge_o_workdir:              /rshare1/ZETTAI_path_WA_slash_home_KARA/home/yjyu/scseq-code
sge_o_host:                 pmg04i
account:                    sge
cwd:                        /home/yjyu/scseq-code
stderr_path_list:           NONE:NONE:scripts/start_jupyter_e.txt
hard_resource_list:         mem_req=20G,s_vmem=20G
mail_list:                  yjyu@pmg04i
notify:                     FALSE
job_name:                   start_jupyter.sh
stdout_path_list:           NONE:NONE:scripts/start_jupyter_o.txt
priority:                   0
jobshare:                   0
shell_list:                 NONE:/bin/bash
env_list:                   LD_LIBRARY_PATH=/usr/local/package/ruby/3.2.2/lib:/usr/local/package/r/4.3.2/lib64/R/lib:/usr/local/package/python/3.12.0/lib:/usr/local/package/postgresql/16.1/lib:/usr/local/package/mysql/8.0.35/lib:/usr/local/package/lua/5.4.6/lib:/usr/local/package/llvm/17.0.4/lib:/usr/local/package/gcc/13.2.0/lib64:/usr/local/package/gcc/13.2.0/lib:/usr/local/lib64:/usr/local/lib
script_file:                /home/yjyu/scseq-code/scripts/start_jupyter.sh
parallel environment:       def_slot range: 3
department:                 defaultdepartment
binding:                    NONE
mbind:                      NONE
submit_cmd:                 orgqsub -hard -l mem_req=20G /home/yjyu/scseq-code/scripts/start_jupyter.sh
category_id:                8110
request_dispatch_info:      FALSE
scheduling info:            (Collecting of scheduler job information is turned off)
*/

qdel abc
The job abc of user(s) yjyu does not exist
```