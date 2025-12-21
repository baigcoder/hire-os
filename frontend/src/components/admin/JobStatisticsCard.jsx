import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, TrendingUp, Users } from "lucide-react";

const JobStatisticsCard = ({ jobs }) => {
  // Process job data for statistics
  const processJobData = () => {
    if (!jobs || jobs.length === 0) return [];

    // Get the last 6 months for the chart
    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        name: month.toLocaleString("default", { month: "short" }),
        jobs: 0,
        applications: 0,
        month: month.getMonth(),
        year: month.getFullYear(),
      });
    }

    // Count jobs and applications by month
    jobs.forEach((job) => {
      const jobDate = new Date(job.createdAt);
      const jobMonth = jobDate.getMonth();
      const jobYear = jobDate.getFullYear();

      // Find matching month in our data
      const monthData = last6Months.find(
        (m) => m.month === jobMonth && m.year === jobYear,
      );
      if (monthData) {
        monthData.jobs += 1;
        monthData.applications += job.applications
          ? job.applications.length
          : 0;
      }
    });

    return last6Months;
  };

  // Calculate trend percentages
  const calculateTrends = () => {
    if (!jobs || jobs.length === 0) return { jobTrend: 0, applicationTrend: 0 };

    const data = processJobData();

    // Compare current month with previous month
    const currentMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];

    let jobTrend = 0;
    let applicationTrend = 0;

    if (previousMonth.jobs > 0) {
      jobTrend =
        ((currentMonth.jobs - previousMonth.jobs) / previousMonth.jobs) * 100;
    } else if (currentMonth.jobs > 0) {
      jobTrend = 100; // If previous month had 0 jobs but current has some, that's a 100% increase
    }

    if (previousMonth.applications > 0) {
      applicationTrend =
        ((currentMonth.applications - previousMonth.applications) /
          previousMonth.applications) *
        100;
    } else if (currentMonth.applications > 0) {
      applicationTrend = 100;
    }

    return {
      jobTrend: Math.round(jobTrend),
      applicationTrend: Math.round(applicationTrend),
    };
  };

  const chartData = processJobData();
  const { jobTrend, applicationTrend } = calculateTrends();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Job Posting Activity</CardTitle>
        <CardDescription>
          Job postings and applications over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="rounded-full bg-blue-100 p-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Job Postings</p>
              <div className="flex items-center">
                <span
                  className={`text-sm ${jobTrend >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {jobTrend >= 0 ? "+" : ""}
                  {jobTrend}%
                </span>
                <ArrowUpRight
                  className={`h-3 w-3 ml-1 ${jobTrend >= 0 ? "text-green-600" : "text-red-600 transform rotate-90"}`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="rounded-full bg-purple-100 p-2">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Applications</p>
              <div className="flex items-center">
                <span
                  className={`text-sm ${applicationTrend >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {applicationTrend >= 0 ? "+" : ""}
                  {applicationTrend}%
                </span>
                <ArrowUpRight
                  className={`h-3 w-3 ml-1 ${applicationTrend >= 0 ? "text-green-600" : "text-red-600 transform rotate-90"}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="jobs"
                name="Job Postings"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="applications"
                name="Applications"
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobStatisticsCard;
